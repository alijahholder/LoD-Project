"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { computeLodFilingDeadline } from "@/lib/lod/deadlines";
import { Trash2, Plus } from "lucide-react";

type TeamStint = { team: string; startYear: number; endYear: number };

type WizardData = {
  legalFirstName: string;
  legalLastName: string;
  preferredName: string;
  dateOfBirth: string;
  position: string;
  creditedSeasons: number;
  lastActivePlayerDate: string;
  teams: TeamStint[];
};

const POSITIONS = [
  "QB","RB","FB","WR","TE","OL","C","G","T",
  "DL","DE","DT","NT","LB","ILB","OLB",
  "DB","CB","S","FS","SS",
  "K","P","LS","KR","PR","ATH"
];

export default function OnboardingWizard({ initial }: { initial: WizardData | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>(
    initial ?? {
      legalFirstName: "",
      legalLastName: "",
      preferredName: "",
      dateOfBirth: "",
      position: "",
      creditedSeasons: 0,
      lastActivePlayerDate: "",
      teams: [],
    },
  );

  const deadline =
    data.lastActivePlayerDate && Number.isFinite(data.creditedSeasons)
      ? computeLodFilingDeadline({
          lastActivePlayerDate: new Date(data.lastActivePlayerDate),
          creditedSeasons: Number(data.creditedSeasons),
        })
      : null;

  function update<K extends keyof WizardData>(k: K, v: WizardData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function addTeam() {
    update("teams", [...data.teams, { team: "", startYear: new Date().getFullYear() - 5, endYear: new Date().getFullYear() - 4 }]);
  }
  function removeTeam(idx: number) {
    update("teams", data.teams.filter((_, i) => i !== idx));
  }
  function updateTeam(idx: number, patch: Partial<TeamStint>) {
    update("teams", data.teams.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? "Could not save profile.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="space-y-4">
      <Stepper current={step} steps={["Identity", "Career", "Deadline & confirm"]} />

      {step === 1 ? (
        <Card>
          <CardHeader><CardTitle>Step 1 — Identity</CardTitle></CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">Legal first name</Label>
              <Input id="firstName" value={data.legalFirstName} onChange={(e) => update("legalFirstName", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="lastName">Legal last name</Label>
              <Input id="lastName" value={data.legalLastName} onChange={(e) => update("legalLastName", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="preferredName">Preferred name</Label>
              <Input id="preferredName" value={data.preferredName} onChange={(e) => update("preferredName", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={data.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} required />
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!data.legalFirstName || !data.legalLastName || !data.dateOfBirth}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader><CardTitle>Step 2 — Your NFL career</CardTitle></CardHeader>
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="pos">Primary position</Label>
                <Select id="pos" value={data.position} onChange={(e) => update("position", e.target.value)}>
                  <option value="">Select…</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="cs">Credited seasons</Label>
                <Input id="cs" type="number" min={0} max={30} value={data.creditedSeasons} onChange={(e) => update("creditedSeasons", parseInt(e.target.value || "0", 10))} />
                <p className="mt-1 text-xs text-brand-600">Per the Plan: a season in which you were on a 53-man roster, IR, or PUP for 3+ regular-season games.</p>
              </div>
              <div>
                <Label htmlFor="lapd">Last day as an active player</Label>
                <Input id="lapd" type="date" value={data.lastActivePlayerDate} onChange={(e) => update("lastActivePlayerDate", e.target.value)} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Team history</Label>
                <Button variant="outline" size="sm" type="button" onClick={addTeam}>
                  <Plus className="h-4 w-4" /> Add stint
                </Button>
              </div>
              <div className="space-y-2">
                {data.teams.length === 0 ? (
                  <p className="text-sm text-brand-600">No teams added yet.</p>
                ) : null}
                {data.teams.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_120px_auto] items-end gap-2">
                    <div>
                      <Input placeholder="Team name" value={t.team} onChange={(e) => updateTeam(i, { team: e.target.value })} />
                    </div>
                    <div>
                      <Input type="number" min={1960} max={2100} value={t.startYear} onChange={(e) => updateTeam(i, { startYear: parseInt(e.target.value || "0", 10) })} />
                    </div>
                    <div>
                      <Input type="number" min={1960} max={2100} value={t.endYear} onChange={(e) => updateTeam(i, { endYear: parseInt(e.target.value || "0", 10) })} />
                    </div>
                    <Button variant="ghost" type="button" onClick={() => removeTeam(i)} aria-label="Remove team">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!data.lastActivePlayerDate}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader><CardTitle>Step 3 — Your filing deadline</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            {deadline ? (
              <Callout tone="info" title="Computed LOD filing deadline">
                <strong>{deadline.toLocaleDateString(undefined, { dateStyle: "long" })}</strong>
                <p className="mt-1">
                  Per the Plan, the filing deadline is the GREATER of (a) 48 months from your last day as an active player, or (b) the number of years equal to your Credited Seasons from that date. With your inputs ({data.creditedSeasons} credited season{data.creditedSeasons === 1 ? "" : "s"}; last active {new Date(data.lastActivePlayerDate).toLocaleDateString()}), the later of those two is the date above.
                </p>
              </Callout>
            ) : (
              <p className="text-sm text-brand-700">Add your last active date and credited seasons in step 2 to compute the deadline.</p>
            )}

            <Callout tone="warn" title="What happens next">
              When you save, we'll start an empty LOD claim workspace for you. You'll then upload medical records and run the eligibility prescreen.
            </Callout>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
            ) : null}
          </CardBody>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={save} disabled={saving || !deadline}>{saving ? "Saving…" : "Save & continue"}</Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}

function Stepper({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((s, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                (done
                  ? "bg-emerald-500 text-white"
                  : active
                  ? "bg-brand-700 text-white"
                  : "bg-brand-100 text-brand-700")
              }
              aria-current={active ? "step" : undefined}
            >
              {idx}
            </span>
            <span className={active ? "font-medium text-brand-900" : "text-brand-700"}>{s}</span>
            {idx < steps.length ? <span aria-hidden className="mx-1 h-px w-6 bg-brand-200" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
