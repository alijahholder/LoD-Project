"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Plus, Trash2, ShieldCheck } from "lucide-react";
import { Callout } from "@/components/ui/callout";

type Category = {
  id?: string;
  code: string;
  bodyRegion: string;
  title: string;
  description: string;
  points: number;
  pathway: string;
  evidenceRequirements: string[];
  excludedFromLOD: boolean;
  sortOrder: number;
};

const PATHWAYS = [
  { value: "orthopedic", label: "Orthopedic" },
  { value: "speech_sight", label: "Speech/Sight" },
  { value: "hearing", label: "Hearing" },
  { value: "vital_organ_cns", label: "Vital organ / CNS" },
];

export default function RubricEditor({
  rubricId,
  initial,
  isActive,
}: {
  rubricId: string;
  initial: Category[];
  isActive: boolean;
}) {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>(initial);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update(idx: number, patch: Partial<Category>) {
    setCats((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function add() {
    setCats((cs) => [
      ...cs,
      {
        code: "NEW-CATEGORY-" + (cs.length + 1),
        bodyRegion: "knee",
        title: "New category",
        description: "",
        points: 1,
        pathway: "orthopedic",
        evidenceRequirements: [],
        excludedFromLOD: false,
        sortOrder: cs.length,
      },
    ]);
  }
  function remove(idx: number) {
    setCats((cs) => cs.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const res = await fetch(`/api/admin/rubric/${rubricId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: cats }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Save failed.");
      return;
    }
    setSuccess("Saved.");
    router.refresh();
  }

  async function publish() {
    setError(null);
    setPublishing(true);
    const res = await fetch(`/api/admin/rubric/${rubricId}/publish`, { method: "POST" });
    setPublishing(false);
    if (!res.ok) {
      setError("Publish failed.");
      return;
    }
    setSuccess("Published. New claims will use this rubric.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {success ? <Callout tone="success">{success}</Callout> : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Pathway</th>
              <th className="px-3 py-2">Body region</th>
              <th className="px-3 py-2">Title / description</th>
              <th className="px-3 py-2">Pts</th>
              <th className="px-3 py-2">Excluded</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {cats.map((c, i) => (
              <tr key={i}>
                <td className="px-3 py-2 align-top">
                  <Input value={c.code} onChange={(e) => update(i, { code: e.target.value })} />
                </td>
                <td className="px-3 py-2 align-top">
                  <Select value={c.pathway} onChange={(e) => update(i, { pathway: e.target.value })}>
                    {PATHWAYS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                </td>
                <td className="px-3 py-2 align-top">
                  <Input value={c.bodyRegion} onChange={(e) => update(i, { bodyRegion: e.target.value })} />
                </td>
                <td className="px-3 py-2 align-top">
                  <Input className="mb-1" value={c.title} onChange={(e) => update(i, { title: e.target.value })} />
                  <Textarea rows={2} value={c.description} onChange={(e) => update(i, { description: e.target.value })} />
                </td>
                <td className="px-3 py-2 align-top">
                  <Input type="number" min={0} max={50} className="w-16" value={c.points} onChange={(e) => update(i, { points: parseInt(e.target.value || "0", 10) })} />
                </td>
                <td className="px-3 py-2 align-top">
                  <input type="checkbox" checked={c.excludedFromLOD} onChange={(e) => update(i, { excludedFromLOD: e.target.checked })} />
                </td>
                <td className="px-3 py-2 align-top">
                  <Button variant="ghost" size="sm" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={add} type="button">
          <Plus className="h-4 w-4" /> Add category
        </Button>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} type="button">{saving ? "Saving…" : "Save changes"}</Button>
          {!isActive ? (
            <Button variant="primary" onClick={publish} disabled={publishing} type="button">
              <ShieldCheck className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish as active"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
