"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatDate, formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Payment = {
  id: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  offsetTotal: number;
  net: number;
  paidAt: string | null;
  notes: string;
};

export default function PaymentsClient({
  claimId,
  payments,
}: {
  claimId: string;
  payments: Payment[];
}) {
  const router = useRouter();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [gross, setGross] = useState("");
  const [offsetTotal, setOffsetTotal] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    setBusy(true);
    const g = Number(gross);
    const o = Number(offsetTotal || 0);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimId,
        periodStart,
        periodEnd,
        gross: g,
        offsetTotal: o,
        net: Math.max(0, g - o),
        paidAt: paidAt || null,
        notes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "Could not save payment.");
      return;
    }
    setPeriodStart(""); setPeriodEnd(""); setGross(""); setOffsetTotal(""); setPaidAt(""); setNotes("");
    router.refresh();
  }

  async function markPaid(id: string) {
    const res = await fetch(`/api/payments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paidAt: new Date().toISOString().slice(0, 10) }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this payment record?")) return;
    const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const expectedRunRate = payments.slice(0, 3);
  const lateCount = payments.filter((p) => !p.paidAt && new Date(p.periodEnd) < new Date()).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Payment ledger</CardTitle>
          {lateCount > 0 ? <Badge tone="danger">{lateCount} late</Badge> : null}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="rounded-lg border border-brand-100 p-4">
          <div className="grid gap-3 sm:grid-cols-6">
            <div>
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label>Gross $</Label>
              <Input type="number" min="0" value={gross} onChange={(e) => setGross(e.target.value)} />
            </div>
            <div>
              <Label>Offsets $</Label>
              <Input type="number" min="0" value={offsetTotal} onChange={(e) => setOffsetTotal(e.target.value)} />
            </div>
            <div>
              <Label>Paid on</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
            <div className="self-end">
              <Button onClick={add} disabled={busy || !periodStart || !periodEnd || !gross} className="w-full">
                {busy ? "Saving…" : "Add"}
              </Button>
            </div>
            <div className="sm:col-span-6">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Check #, deposit ref, etc." />
            </div>
          </div>
          {err ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div> : null}
        </div>

        <div className="rounded-lg border border-brand-100">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
            <span>Period</span>
            <span>Gross</span>
            <span>Offsets</span>
            <span>Net</span>
            <span>Paid</span>
            <span />
          </div>
          <div className="divide-y divide-brand-100">
            {payments.length === 0 ? (
              <div className="px-3 py-3 text-sm text-brand-600">No payments recorded yet.</div>
            ) : null}
            {payments.map((p) => {
              const late = !p.paidAt && new Date(p.periodEnd) < new Date();
              return (
                <div key={p.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2 px-3 py-2 text-sm">
                  <span>{formatDate(p.periodStart)} → {formatDate(p.periodEnd)}</span>
                  <span>{formatMoney(p.gross)}</span>
                  <span>{formatMoney(p.offsetTotal)}</span>
                  <span className="font-medium">{formatMoney(p.net)}</span>
                  <span className="flex items-center gap-2">
                    {p.paidAt ? <Badge tone="ok">{formatDate(p.paidAt)}</Badge> : late ? <Badge tone="danger">late</Badge> : <Badge tone="warn">pending</Badge>}
                  </span>
                  <span className="flex gap-1">
                    {!p.paidAt ? <Button variant="ghost" size="sm" onClick={() => markPaid(p.id)}>Mark paid</Button> : null}
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>X</Button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {expectedRunRate.length > 0 ? (
          <p className="text-xs text-brand-600">
            Reconcile each monthly check against the projected net. Discrepancies are usually offset miscalculations or timing of SSDI/WC start dates.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
