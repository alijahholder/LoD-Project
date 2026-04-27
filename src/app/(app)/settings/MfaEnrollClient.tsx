"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

export default function MfaEnrollClient({ enrolled, email }: { enrolled: boolean; email: string }) {
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/mfa/start", { method: "POST" });
    setLoading(false);
    if (!res.ok) { setError("Could not start enrollment."); return; }
    const data = await res.json();
    setOtpauthUrl(data.otpauthUrl);
    setQrDataUrl(data.qrDataUrl);
  }

  async function verify() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (!res.ok) { setError("Code didn't verify. Try again."); return; }
    setSuccess("MFA enrolled. You'll be asked for a code on next sign-in.");
    setOtpauthUrl(null);
    setQrDataUrl(null);
  }

  async function disable() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/mfa/disable", { method: "POST" });
    setLoading(false);
    if (!res.ok) { setError("Could not disable MFA."); return; }
    setSuccess("MFA disabled.");
  }

  if (success) return <Callout tone="success">{success}</Callout>;

  return (
    <div className="space-y-3">
      {enrolled ? (
        <Button variant="outline" onClick={disable} disabled={loading}>Disable MFA</Button>
      ) : !otpauthUrl ? (
        <Button onClick={start} disabled={loading}>{loading ? "Starting…" : "Enroll authenticator app"}</Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-brand-700">Scan this QR code with your authenticator, then enter the 6-digit code below.</p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`QR code for ${email}`} src={qrDataUrl} className="h-48 w-48 rounded border border-brand-100 bg-white p-2" />
          ) : null}
          <details className="text-xs text-brand-600">
            <summary>Can't scan? Show secret URI</summary>
            <code className="block break-all rounded bg-brand-50 p-2">{otpauthUrl}</code>
          </details>
          <div>
            <Label htmlFor="code">6-digit code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </div>
          <Button onClick={verify} disabled={loading || code.length < 6}>Verify &amp; activate</Button>
        </div>
      )}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
    </div>
  );
}
