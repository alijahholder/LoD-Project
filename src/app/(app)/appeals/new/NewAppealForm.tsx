"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

export default function NewAppealForm({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [deniedAt, setDeniedAt] = useState("");
  const [hearingType, setHearingType] = useState("IPB");
  const [denialLetter, setDenialLetter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/appeals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId, deniedAt, hearingType, denialLetter }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Could not start appeal.");
      return;
    }
    const { id } = await res.json();
    router.push(`/appeals/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="den">Date on denial letter</Label>
          <Input id="den" type="date" value={deniedAt} onChange={(e) => setDeniedAt(e.target.value)} required />
          <p className="mt-1 text-xs text-brand-600">The 180-day clock runs from this date.</p>
        </div>
        <div>
          <Label htmlFor="lvl">Hearing level</Label>
          <Select id="lvl" value={hearingType} onChange={(e) => setHearingType(e.target.value)}>
            <option value="IPB">Initial Plan-level review (DICC)</option>
            <option value="MAB">Medical Advisory Board (MAB)</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="text">Denial letter text (paste it here for parsing)</Label>
        <Textarea id="text" rows={8} value={denialLetter} onChange={(e) => setDenialLetter(e.target.value)} placeholder="Paste the denial letter from the Plan. We'll surface the cited reasons and the categories that were rejected so you can argue them point by point." />
      </div>

      <Callout tone="warn" title="Build the record now">
        Whatever you don't put in the record now will not be available to a federal judge later. Add every supplemental letter, affidavit, and additional record you can.
      </Callout>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy || !deniedAt}>{busy ? "Starting…" : "Start appeal"}</Button>
      </div>
    </div>
  );
}
