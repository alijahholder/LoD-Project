"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { Badge } from "@/components/ui/badge";
import {
  evaluateLodEligibility,
  LOD_EXCLUDED_CONDITIONS,
} from "@/lib/lod/eligibility";

type Answers = {
  estimatedOrthoPoints: number;
  speechLossPct: number;
  sightLossPct: number;
  hearingLossPct: number;
  vitalOrganOrCNS: boolean;
  hasExcludedConditions: boolean;
  notes: string;
};

export default function PrescreenForm({ claimId }: { claimId: string | null }) {
  const router = useRouter();
  const [a, setA] = useState<Answers>({
    estimatedOrthoPoints: 0,
    speechLossPct: 0,
    sightLossPct: 0,
    hearingLossPct: 0,
    vitalOrganOrCNS: false,
    hasExcludedConditions: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(
    () =>
      evaluateLodEligibility({
        orthopedicPoints: Number(a.estimatedOrthoPoints) || 0,
        speechLossPct: Number(a.speechLossPct) || 0,
        sightLossPct: Number(a.sightLossPct) || 0,
        hearingLossPct: Number(a.hearingLossPct) || 0,
        vitalOrganOrCNSImpairment: a.vitalOrganOrCNS,
      }),
    [a],
  );

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setA((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/claim/prescreen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: a, eligibility: result }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Could not save prescreen.");
      return;
    }
    const { claimId: newId } = await res.json();
    router.push(`/claim/${newId ?? claimId}`);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your best estimate of each pathway</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="ortho">Estimated orthopedic points (Appendix A)</Label>
            <Input id="ortho" type="number" min={0} max={50} value={a.estimatedOrthoPoints} onChange={(e) => set("estimatedOrthoPoints", parseInt(e.target.value || "0", 10))} />
            <p className="mt-1 text-xs text-brand-600">Your best guess; the system will recompute precisely from confirmed findings.</p>
          </div>
          <div>
            <Label htmlFor="hear">Hearing loss %</Label>
            <Input id="hear" type="number" min={0} max={100} value={a.hearingLossPct} onChange={(e) => set("hearingLossPct", parseInt(e.target.value || "0", 10))} />
          </div>
          <div>
            <Label htmlFor="sight">Sight loss %</Label>
            <Input id="sight" type="number" min={0} max={100} value={a.sightLossPct} onChange={(e) => set("sightLossPct", parseInt(e.target.value || "0", 10))} />
          </div>
          <div>
            <Label htmlFor="speech">Speech loss %</Label>
            <Input id="speech" type="number" min={0} max={100} value={a.speechLossPct} onChange={(e) => set("speechLossPct", parseInt(e.target.value || "0", 10))} />
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={a.vitalOrganOrCNS} onChange={(e) => set("vitalOrganOrCNS", e.target.checked)} className="mt-1 h-4 w-4" />
            <span>Surgical removal or major functional impairment of a vital organ or central nervous system part (e.g., nephrectomy, splenectomy, peripheral nerve damage, spinal cord injury) caused or contributed to by NFL football activity.</span>
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={a.hasExcludedConditions} onChange={(e) => set("hasExcludedConditions", e.target.checked)} className="mt-1 h-4 w-4" />
            <span>I'm primarily seeking benefits for neurocognitive, brain-neurological (non-nerve), or psychiatric conditions.</span>
          </label>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Anything else you want to flag?</Label>
            <Textarea id="notes" rows={3} value={a.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Live eligibility snapshot</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={result.paths.orthopedic.met ? "ok" : "muted"}>
              Orthopedic ≥ 9 pts: {result.paths.orthopedic.current}/9 {result.paths.orthopedic.met ? "✓" : ""}
            </Badge>
            <Badge tone={result.paths.speechSight.met ? "ok" : "muted"}>
              Speech/Sight ≥ 50%: {Math.max(result.paths.speechSight.speech, result.paths.speechSight.sight)}% {result.paths.speechSight.met ? "✓" : ""}
            </Badge>
            <Badge tone={result.paths.hearing.met ? "ok" : "muted"}>
              Hearing ≥ 55%: {result.paths.hearing.current}% {result.paths.hearing.met ? "✓" : ""}
            </Badge>
            <Badge tone={result.paths.vitalOrganCNS.met ? "ok" : "muted"}>
              Vital organ/CNS: {result.paths.vitalOrganCNS.met ? "yes" : "no"}
            </Badge>
          </div>

          {result.eligible ? (
            <Callout tone="success" title="You appear to meet at least one eligibility path">
              {result.summary} The next steps will collect medical records and confirm exact point values from your documentation.
            </Callout>
          ) : (
            <Callout tone="warn" title="No path is met yet — that's OK">
              {result.summary} Most players don't know their precise orthopedic point total without their records. Continue and let the system pull diagnoses out of your medical documents.
            </Callout>
          )}

          {a.hasExcludedConditions ? (
            <Callout tone="danger" title="LOD does not cover the conditions you flagged">
              Effective 4/1/2020, the Line of Duty benefit excludes:
              <ul className="mt-2 list-disc pl-5">
                {LOD_EXCLUDED_CONDITIONS.map((c) => <li key={c}>{c}</li>)}
              </ul>
              These may still be covered under <strong>Total &amp; Permanent</strong> or <strong>Neurocognitive</strong> benefits — out of scope for this version of the app, but worth pursuing separately. You can still file LOD if you also have a qualifying orthopedic / sensory / vital-organ pathway.
            </Callout>
          ) : null}

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving prescreen…" : "Save & open my claim workspace"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
