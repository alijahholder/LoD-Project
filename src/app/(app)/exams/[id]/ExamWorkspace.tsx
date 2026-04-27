"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";

type PrepItem = { id: string; label: string; done: boolean };

export default function ExamWorkspace({
  id,
  initial,
}: {
  id: string;
  initial: {
    physicianName: string;
    specialty: string;
    scheduledFor: string;
    location: string;
    postNotes: string;
    inadequate: boolean;
    supplementalLetterMd: string;
    prep: PrepItem[];
  };
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  function setField<K extends keyof typeof data>(k: K, v: (typeof data)[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }
  function toggle(itemId: string, done: boolean) {
    setData((d) => ({ ...d, prep: d.prep.map((p) => (p.id === itemId ? { ...p, done } : p)) }));
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/exams/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    setSuccess(res.ok ? "Saved." : "Save failed.");
    setTimeout(() => setSuccess(null), 2500);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="phys">Physician</Label>
          <Input id="phys" value={data.physicianName} onChange={(e) => setField("physicianName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="spec">Specialty</Label>
          <Input id="spec" value={data.specialty} onChange={(e) => setField("specialty", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="when">Scheduled</Label>
          <Input id="when" type="datetime-local" value={data.scheduledFor} onChange={(e) => setField("scheduledFor", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={data.location} onChange={(e) => setField("location", e.target.value)} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-brand-900">Prep checklist</h3>
        <ul className="space-y-2 text-sm">
          {data.prep.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <input type="checkbox" checked={p.done} onChange={(e) => toggle(p.id, e.target.checked)} className="mt-1 h-4 w-4" />
              <span className={p.done ? "text-brand-500 line-through" : "text-brand-800"}>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Label htmlFor="post">Post-exam notes</Label>
        <Textarea id="post" rows={5} value={data.postNotes} onChange={(e) => setField("postNotes", e.target.value)} placeholder="What was tested, what was missed, what the doctor said. Capture this within 24 hours of the exam." />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.inadequate} onChange={(e) => setField("inadequate", e.target.checked)} className="h-4 w-4" />
          Flag this exam as inadequate (e.g., didn't test relevant body region, was rushed, didn't review records)
        </label>
      </div>

      {data.inadequate ? (
        <div>
          <Label htmlFor="sup">Supplemental letter draft (sent to the Plan)</Label>
          <Textarea
            id="sup"
            rows={6}
            value={data.supplementalLetterMd}
            onChange={(e) => setField("supplementalLetterMd", e.target.value)}
            placeholder="Outline why the exam was inadequate, citing specific body regions or findings that were not assessed. The Plan must consider this letter as part of the administrative record."
          />
          <Callout tone="info" title="Why this matters">
            Under ERISA, you build the record now; you can't add new evidence in federal court later. A short, factual letter explaining what was missed is one of the most valuable additions to the record.
          </Callout>
        </div>
      ) : null}

      {success ? <Callout tone="success">{success}</Callout> : null}
      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
