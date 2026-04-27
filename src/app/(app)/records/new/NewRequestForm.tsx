"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

export default function NewRequestForm({
  claimId,
  initialType,
}: {
  claimId: string;
  initialType: "nfl_club" | "third_party";
}) {
  const router = useRouter();
  const [type, setType] = useState<"nfl_club" | "third_party">(initialType);
  const [providerName, setProviderName] = useState("");
  const [providerContact, setProviderContact] = useState("");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [method, setMethod] = useState("mail");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimId,
        providerType: type,
        providerName,
        providerContact,
        dateRangeStart,
        dateRangeEnd,
        method,
        notes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Could not create request.");
      return;
    }
    const { id } = await res.json();
    router.push(`/records/${id}`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Provider type</Label>
          <Select id="type" value={type} onChange={(e) => setType(e.target.value as "nfl_club" | "third_party")}>
            <option value="nfl_club">NFL Club</option>
            <option value="third_party">Third-party (clinic/hospital/specialist)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="provider">Provider name</Label>
          <Input id="provider" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder={type === "nfl_club" ? "e.g., Atlanta Falcons" : "e.g., Andrews Sports Medicine"} required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="contact">Provider contact (phone / email / address)</Label>
          <Textarea id="contact" rows={2} value={providerContact} onChange={(e) => setProviderContact(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="from">Records from</Label>
          <Input id="from" type="date" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="to">Records through</Label>
          <Input id="to" type="date" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="method">Request method</Label>
          <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="mail">Mail</option>
            <option value="fax">Fax</option>
            <option value="portal">Online portal</option>
            <option value="email">Email</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <Callout tone="info" title="What happens next">
        We'll generate a pre-filled HIPAA authorization and schedule three follow-up checkpoints (day 14, day 30, day 45) so nothing falls through the cracks.
      </Callout>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy || !providerName}>{busy ? "Creating…" : "Create request"}</Button>
      </div>
    </div>
  );
}
