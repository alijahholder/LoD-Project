"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input, Label } from "@/components/ui/input";
import { FileDown, ShieldCheck, Send } from "lucide-react";

export default function BuilderActions({ claimId, canSubmit }: { claimId: string; canSubmit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [packetUrl, setPacketUrl] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/claim/${claimId}/packet`, { method: "POST" });
    setBusy(false);
    if (!res.ok) { setError("Could not generate packet."); return; }
    const j = await res.json();
    setPacketUrl(j.url);
    router.refresh();
  }

  async function sign() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/claim/${claimId}/sign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signerName }),
    });
    setBusy(false);
    if (!res.ok) { setError("Sign failed."); return; }
    router.refresh();
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/claim/${claimId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "initial_application", signerName: signerName || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Submission failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="signer">Signer name (your full legal name)</Label>
          <Input id="signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="As it should appear on the application" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={generate} disabled={busy}><FileDown className="h-4 w-4" /> Generate packet PDF</Button>
        <Button variant="outline" onClick={sign} disabled={busy || !signerName}><ShieldCheck className="h-4 w-4" /> E-sign packet</Button>
        <Button onClick={submit} disabled={busy || !canSubmit}><Send className="h-4 w-4" /> Submit & snapshot</Button>
      </div>

      {packetUrl ? (
        <Callout tone="success" title="Packet generated">
          <a href={packetUrl} className="underline" target="_blank" rel="noreferrer">Download the PDF</a>
        </Callout>
      ) : null}

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

      {!canSubmit ? (
        <Callout tone="warn" title="Confirm at least one finding before submitting">
          Submitting freezes the administrative record. Make sure you've reviewed the AI suggestions and confirmed the findings you want to assert.
        </Callout>
      ) : null}
    </div>
  );
}
