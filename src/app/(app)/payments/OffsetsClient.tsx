"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Offset = {
  id: string;
  source: string;
  monthlyAmount: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
};

export default function OffsetsClient({ profileId, offsets }: { profileId: string; offsets: Offset[] }) {
  const router = useRouter();
  const [source, setSource] = useState("SSDI");
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    setBusy(true);
    const res = await fetch("/api/offsets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profileId,
        source,
        monthlyAmount: Number(amount),
        effectiveFrom: from,
        effectiveTo: to || null,
        notes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "Could not save offset.");
      return;
    }
    setAmount(""); setFrom(""); setTo(""); setNotes("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this offset?")) return;
    const res = await fetch(`/api/offsets/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SSDI / Workers' Comp offsets</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="rounded-lg border border-brand-100 p-4">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-1">
              <Label>Source</Label>
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="SSDI">SSDI</option>
                <option value="WC">Workers' Comp</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Label>Monthly $</Label>
              <Input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label>Effective from</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="sm:col-span-1">
              <Label>Effective to</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="sm:col-span-1 sm:col-start-1 sm:col-span-4">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Award letter date, case #, …" />
            </div>
            <div className="sm:col-span-1 self-end">
              <Button onClick={add} disabled={busy || !amount || !from} className="w-full">
                {busy ? "Saving…" : "Add"}
              </Button>
            </div>
          </div>
          {err ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div> : null}
        </div>

        <div className="rounded-lg border border-brand-100">
          <div className="border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
            Recorded offsets
          </div>
          <div className="divide-y divide-brand-100">
            {offsets.length === 0 ? (
              <div className="px-3 py-3 text-sm text-brand-600">No offsets recorded.</div>
            ) : null}
            {offsets.map((o) => {
              const active = !o.effectiveTo || new Date(o.effectiveTo) > new Date();
              return (
                <div key={o.id} className="flex items-center gap-3 px-3 py-3 text-sm">
                  <Badge tone={o.source === "SSDI" ? "info" : o.source === "WC" ? "warn" : "muted"}>{o.source}</Badge>
                  <span className="font-medium">{formatMoney(o.monthlyAmount)}/mo</span>
                  <span className="text-brand-600">{formatDate(o.effectiveFrom)} → {o.effectiveTo ? formatDate(o.effectiveTo) : "ongoing"}</span>
                  {active ? <Badge tone="ok">active</Badge> : <Badge tone="muted">expired</Badge>}
                  {o.notes ? <span className="truncate text-xs text-brand-600" title={o.notes}>· {o.notes}</span> : null}
                  <span className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => remove(o.id)}>Remove</Button>
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
