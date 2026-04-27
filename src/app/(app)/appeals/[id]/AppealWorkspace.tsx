"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

type AppealView = {
  id: string;
  status: string;
  hearingType: string;
  hearingDate: string | null;
  filedAt: string | null;
  briefMarkdown: string;
  themesJson: string;
  exhibitsJson: string;
  witnessPlanJson: string;
  mockQAJson: string;
  decisionMemo: string;
  decisionOutcome: string | null;
};

type DocView = {
  id: string;
  filename: string;
  source: string;
  uploadedAt: string;
};

type FindingView = {
  id: string;
  status: string;
  points: number;
  category: { code: string; title: string; bodyRegion: string };
};

type Exhibit = {
  number: number;
  documentId: string;
  filename: string;
  description: string;
};

type Witness = { name: string; role: string; topic: string };
type MockQA = { q: string; a: string };

function safeParse<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

const TAB_KEYS = ["themes", "exhibits", "brief", "hearing"] as const;
type Tab = (typeof TAB_KEYS)[number];

export default function AppealWorkspace({
  appeal,
  documents,
  findings,
}: {
  appeal: AppealView;
  documents: DocView[];
  findings: FindingView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("themes");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [themes, setThemes] = useState<string[]>(safeParse<string[]>(appeal.themesJson, []));
  const [exhibits, setExhibits] = useState<Exhibit[]>(safeParse<Exhibit[]>(appeal.exhibitsJson, []));
  const [brief, setBrief] = useState<string>(appeal.briefMarkdown);
  const [witnesses, setWitnesses] = useState<Witness[]>(safeParse<Witness[]>(appeal.witnessPlanJson, []));
  const [qa, setQa] = useState<MockQA[]>(safeParse<MockQA[]>(appeal.mockQAJson, []));
  const [hearingDate, setHearingDate] = useState<string>(appeal.hearingDate ? appeal.hearingDate.slice(0, 16) : "");
  const [hearingType, setHearingType] = useState(appeal.hearingType);
  const [status, setStatus] = useState(appeal.status);

  const confirmedFindings = useMemo(
    () => findings.filter((f) => f.status === "confirmed"),
    [findings],
  );

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/appeals/${appeal.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        themes,
        exhibits,
        briefMarkdown: brief,
        witnesses,
        mockQA: qa,
        hearingType,
        hearingDate: hearingDate || null,
        status,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "Save failed");
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  async function generateBrief() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/appeals/${appeal.id}/brief`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ themes, exhibits }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "Brief generation failed.");
      return;
    }
    const j = await res.json();
    setBrief(j.brief ?? "");
    setMsg("Generated draft brief. Review and edit before filing.");
  }

  async function fileAppeal() {
    if (!confirm("File this appeal and snapshot the record? This is your ERISA admin record.")) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/appeals/${appeal.id}/file`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j?.error ?? "File failed");
      return;
    }
    const j = await res.json();
    setMsg(`Filed. Snapshot ${j.submissionId?.slice(0, 8)} written.`);
    router.refresh();
  }

  function addExhibitFromDoc(d: DocView) {
    if (exhibits.find((e) => e.documentId === d.id)) return;
    setExhibits([
      ...exhibits,
      { number: exhibits.length + 1, documentId: d.id, filename: d.filename, description: d.source.replace(/_/g, " ") },
    ]);
  }

  function removeExhibit(num: number) {
    setExhibits(exhibits.filter((e) => e.number !== num).map((e, i) => ({ ...e, number: i + 1 })));
  }

  function moveExhibit(num: number, dir: -1 | 1) {
    const idx = exhibits.findIndex((e) => e.number === num);
    if (idx < 0) return;
    const ni = idx + dir;
    if (ni < 0 || ni >= exhibits.length) return;
    const copy = [...exhibits];
    [copy[idx], copy[ni]] = [copy[ni], copy[idx]];
    setExhibits(copy.map((e, i) => ({ ...e, number: i + 1 })));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Appeal workspace</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" onClick={fileAppeal} disabled={busy || appeal.status === "filed"}>
              {appeal.status === "filed" ? "Filed" : "File appeal"}
            </Button>
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1 text-sm">
          {TAB_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 ${tab === k ? "bg-brand-700 text-white" : "text-brand-800 hover:bg-brand-50"}`}
            >
              {k === "themes"
                ? "Themes"
                : k === "exhibits"
                  ? `Exhibits (${exhibits.length})`
                  : k === "brief"
                    ? "Appeal brief"
                    : "Hearing prep"}
            </button>
          ))}
        </nav>
      </CardHeader>
      <CardBody className="space-y-4">
        {err ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div> : null}
        {msg ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</div> : null}

        {tab === "themes" ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-700">
              Each theme becomes a section heading in the appeal brief. We seed them from the denial letter and your confirmed findings.
            </p>
            {themes.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input value={t} onChange={(e) => { const c = [...themes]; c[i] = e.target.value; setThemes(c); }} />
                <Button variant="outline" size="sm" onClick={() => setThemes(themes.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setThemes([...themes, ""])}>+ Add theme</Button>

            <div className="mt-4">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="preparing">preparing</option>
                <option value="filed">filed</option>
                <option value="hearing_scheduled">hearing_scheduled</option>
                <option value="decided">decided</option>
                <option value="withdrawn">withdrawn</option>
              </Select>
            </div>
          </div>
        ) : null}

        {tab === "exhibits" ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-700">
              Build the exhibit list that will be appended to the appeal brief. Order matters — exhibits will be numbered in the order shown.
            </p>

            <div className="rounded-lg border border-brand-100">
              <div className="border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                Available documents
              </div>
              <div className="divide-y divide-brand-100">
                {documents.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-brand-600">Upload documents from the claim workspace first.</div>
                ) : null}
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{d.filename}</div>
                      <div className="text-xs text-brand-600">{d.source.replace(/_/g, " ")}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => addExhibitFromDoc(d)}>+ Add</Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-brand-100">
              <div className="border-b border-brand-100 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                Numbered exhibits
              </div>
              <div className="divide-y divide-brand-100">
                {exhibits.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-brand-600">No exhibits yet.</div>
                ) : null}
                {exhibits.map((e, i) => (
                  <div key={e.number} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Badge tone="default">Ex. {e.number}</Badge>
                    <div className="flex-1">
                      <div className="font-medium">{e.filename}</div>
                      <Input
                        className="mt-1"
                        value={e.description}
                        onChange={(ev) => {
                          const c = [...exhibits]; c[i] = { ...e, description: ev.target.value }; setExhibits(c);
                        }}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => moveExhibit(e.number, -1)}>↑</Button>
                    <Button variant="ghost" size="sm" onClick={() => moveExhibit(e.number, 1)}>↓</Button>
                    <Button variant="outline" size="sm" onClick={() => removeExhibit(e.number)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "brief" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={generateBrief} disabled={busy}>
                {busy ? "Drafting…" : "Generate draft brief"}
              </Button>
              <span className="text-xs text-brand-700">
                Uses your themes, confirmed findings, exhibits, and player profile. Always edit before filing.
              </span>
            </div>
            <Textarea
              rows={28}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Your appeal brief in Markdown will appear here. You can paste your own or generate a draft."
              className="font-mono text-xs"
            />
            <div className="rounded-md border border-brand-100 bg-brand-50/50 p-3 text-xs text-brand-700">
              Confirmed findings included in this brief: {confirmedFindings.length} · total points:{" "}
              {confirmedFindings.reduce((s, f) => s + f.points, 0)}
            </div>
          </div>
        ) : null}

        {tab === "hearing" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Hearing level</Label>
                <Select value={hearingType} onChange={(e) => setHearingType(e.target.value)}>
                  <option value="IPB">Initial Plan-level review (DICC)</option>
                  <option value="MAB">Medical Advisory Board (MAB)</option>
                </Select>
              </div>
              <div>
                <Label>Hearing date / time</Label>
                <Input
                  type="datetime-local"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Witness plan</Label>
              <p className="mb-2 text-xs text-brand-600">Treating physicians, vocational experts, family members.</p>
              {witnesses.map((w, i) => (
                <div key={i} className="mb-2 grid gap-2 rounded-lg border border-brand-100 p-3 sm:grid-cols-3">
                  <Input placeholder="Name" value={w.name} onChange={(e) => { const c = [...witnesses]; c[i] = { ...w, name: e.target.value }; setWitnesses(c); }} />
                  <Input placeholder="Role (e.g. orthopedic surgeon)" value={w.role} onChange={(e) => { const c = [...witnesses]; c[i] = { ...w, role: e.target.value }; setWitnesses(c); }} />
                  <div className="flex gap-2">
                    <Input placeholder="Topic / what they prove" value={w.topic} onChange={(e) => { const c = [...witnesses]; c[i] = { ...w, topic: e.target.value }; setWitnesses(c); }} />
                    <Button variant="outline" size="sm" onClick={() => setWitnesses(witnesses.filter((_, j) => j !== i))}>X</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setWitnesses([...witnesses, { name: "", role: "", topic: "" }])}>+ Add witness</Button>
            </div>

            <div>
              <Label>Mock Q&amp;A drilling</Label>
              <p className="mb-2 text-xs text-brand-600">Anticipated questions from the IPB / MAB and your prepared answer.</p>
              {qa.map((p, i) => (
                <div key={i} className="mb-2 space-y-1 rounded-lg border border-brand-100 p-3">
                  <Input placeholder="Anticipated question" value={p.q} onChange={(e) => { const c = [...qa]; c[i] = { ...p, q: e.target.value }; setQa(c); }} />
                  <Textarea rows={3} placeholder="Your prepared answer (cite exhibits)" value={p.a} onChange={(e) => { const c = [...qa]; c[i] = { ...p, a: e.target.value }; setQa(c); }} />
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setQa(qa.filter((_, j) => j !== i))}>Remove</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setQa([...qa, { q: "", a: "" }])}>+ Add Q/A</Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
