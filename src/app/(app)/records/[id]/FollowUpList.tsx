"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";

type Item = {
  id: string;
  dueAt: string;
  channel: string;
  outcome: string | null;
  notes: string | null;
  completedAt: string | null;
};

export default function FollowUpList({ requestId, items }: { requestId: string; items: Item[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newDue, setNewDue] = useState("");
  const [newChannel, setNewChannel] = useState("call");
  const [newNotes, setNewNotes] = useState("");

  async function complete(id: string, outcome: string, notes: string) {
    setBusyId(id);
    await fetch(`/api/records/${requestId}/followups/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: true, outcome, notes }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function addNew() {
    setAdding(true);
    await fetch(`/api/records/${requestId}/followups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dueAt: newDue, channel: newChannel, notes: newNotes }),
    });
    setAdding(false);
    setNewDue("");
    setNewNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-brand-100">
        {items.length === 0 ? (
          <li className="py-3 text-sm text-brand-500">No follow-ups yet.</li>
        ) : null}
        {items.map((f) => (
          <li key={f.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={f.completedAt ? "ok" : "info"}>{f.completedAt ? "completed" : "scheduled"}</Badge>
              <span className="text-brand-700">
                {new Date(f.dueAt).toLocaleDateString()} · {f.channel}
              </span>
              {f.outcome ? <Badge tone="muted">{f.outcome}</Badge> : null}
            </div>
            {f.notes ? <p className="mt-1 text-xs text-brand-700">{f.notes}</p> : null}
            {!f.completedAt ? (
              <CompleteForm onCompleted={(o, n) => complete(f.id, o, n)} busy={busyId === f.id} />
            ) : null}
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-dashed border-brand-200 p-3">
        <div className="mb-2 text-sm font-medium text-brand-900">Add follow-up</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label htmlFor="due">Due</Label>
            <Input id="due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="channel">Channel</Label>
            <Select id="channel" value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="mail">Mail</option>
              <option value="fax">Fax</option>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="n">Notes</Label>
            <Input id="n" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button onClick={addNew} disabled={adding || !newDue}><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </div>
    </div>
  );
}

function CompleteForm({
  onCompleted,
  busy,
}: {
  onCompleted: (outcome: string, notes: string) => void;
  busy: boolean;
}) {
  const [outcome, setOutcome] = useState("no_answer");
  const [notes, setNotes] = useState("");
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
      <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
        <option value="no_answer">No answer</option>
        <option value="promised">Promised to send</option>
        <option value="sent">Sent</option>
        <option value="refused">Refused</option>
        <option value="needs_release">Needs new release</option>
      </Select>
      <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes (who you spoke with, what they said) — saved to ERISA record" />
      <Button onClick={() => onCompleted(outcome, notes)} disabled={busy} size="sm"><Check className="h-4 w-4" /> Done</Button>
    </div>
  );
}
