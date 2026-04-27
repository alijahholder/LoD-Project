"use client";

import useSWR from "swr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Check, X, Pencil } from "lucide-react";

type Finding = {
  id: string;
  status: "suggested" | "confirmed" | "rejected" | "edited";
  points: number;
  confidence: number;
  rationale: string | null;
  category: { code: string; title: string; bodyRegion: string; pathway: string; points: number };
  citations: { documentId: string; page: number; snippet: string }[];
};

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error("fetch failed");
  return r.json();
};

export default function FindingsReview({ claimId }: { claimId: string }) {
  const router = useRouter();
  const { data, mutate, isLoading } = useSWR<{ findings: Finding[]; gapNotes: string[] }>(
    `/api/claim/${claimId}/findings`,
    fetcher,
  );

  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, decision: "confirmed" | "rejected", points?: number) {
    setBusyId(id);
    const res = await fetch(`/api/claim/${claimId}/findings/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, points }),
    });
    setBusyId(null);
    if (res.ok) {
      await mutate();
      router.refresh();
    }
  }

  if (isLoading) return <p className="text-sm text-brand-600">Loading findings…</p>;
  if (!data || data.findings.length === 0) {
    return (
      <Callout tone="info" title="No findings to review yet">
        Upload medical records above. The AI will extract diagnoses and propose impairment categories — they'll appear here for your approval.
      </Callout>
    );
  }

  const grouped = {
    suggested: data.findings.filter((f) => f.status === "suggested" || f.status === "edited"),
    confirmed: data.findings.filter((f) => f.status === "confirmed"),
    rejected: data.findings.filter((f) => f.status === "rejected"),
  };

  return (
    <div className="space-y-5">
      {data.gapNotes.length > 0 ? (
        <Callout tone="info" title="Gap analysis">
          <ul className="list-disc pl-5">
            {data.gapNotes.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </Callout>
      ) : null}

      <Section title={`Suggested by AI (${grouped.suggested.length})`}>
        {grouped.suggested.length === 0 ? <Empty>Nothing pending.</Empty> : null}
        {grouped.suggested.map((f) => (
          <FindingRow
            key={f.id}
            f={f}
            busy={busyId === f.id}
            onConfirm={(pts) => decide(f.id, "confirmed", pts)}
            onReject={() => decide(f.id, "rejected")}
          />
        ))}
      </Section>

      <Section title={`Confirmed (${grouped.confirmed.length})`}>
        {grouped.confirmed.length === 0 ? <Empty>None confirmed yet.</Empty> : null}
        {grouped.confirmed.map((f) => (
          <FindingRow
            key={f.id}
            f={f}
            busy={busyId === f.id}
            onConfirm={(pts) => decide(f.id, "confirmed", pts)}
            onReject={() => decide(f.id, "rejected")}
          />
        ))}
      </Section>

      <Section title={`Rejected (${grouped.rejected.length})`}>
        {grouped.rejected.length === 0 ? <Empty>None rejected.</Empty> : null}
        {grouped.rejected.map((f) => (
          <FindingRow
            key={f.id}
            f={f}
            busy={busyId === f.id}
            onConfirm={(pts) => decide(f.id, "confirmed", pts)}
            onReject={() => decide(f.id, "rejected")}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-brand-900">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-brand-500">{children}</p>;
}

function FindingRow({
  f,
  onConfirm,
  onReject,
  busy,
}: {
  f: Finding;
  onConfirm: (points?: number) => void;
  onReject: () => void;
  busy: boolean;
}) {
  const [editPts, setEditPts] = useState<number | null>(null);
  const tone = f.status === "confirmed" ? "ok" : f.status === "rejected" ? "muted" : "warn";

  return (
    <div className="rounded-lg border border-brand-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-brand-900">{f.category.title}</span>
            <Badge tone={tone}>{f.status}</Badge>
            <Badge tone="info">{f.category.bodyRegion}</Badge>
            <Badge tone="default">{f.points} pts</Badge>
            <span className="text-xs text-brand-600">conf {Math.round(f.confidence * 100)}%</span>
          </div>
          {f.rationale ? <p className="mt-1 text-xs text-brand-700">{f.rationale}</p> : null}
          {f.citations.length > 0 ? (
            <details className="mt-2 text-xs text-brand-700">
              <summary className="cursor-pointer">Citations ({f.citations.length})</summary>
              <ul className="mt-1 space-y-1 pl-4">
                {f.citations.map((c, i) => (
                  <li key={i}>
                    Page {c.page}: <em>"…{c.snippet}…"</em>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {f.status !== "confirmed" ? (
            <Button size="sm" onClick={() => onConfirm(editPts ?? f.points)} disabled={busy}>
              <Check className="h-4 w-4" /> Confirm
            </Button>
          ) : null}
          {f.status !== "rejected" ? (
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              <X className="h-4 w-4" /> Reject
            </Button>
          ) : null}
          <details className="text-xs text-brand-600">
            <summary className="flex cursor-pointer items-center gap-1"><Pencil className="h-3 w-3" /> Edit points</summary>
            <input
              type="number"
              defaultValue={f.points}
              min={0}
              max={50}
              className="mt-1 w-20 rounded border border-brand-200 px-2 py-1 text-sm"
              onChange={(e) => setEditPts(parseInt(e.target.value || "0", 10))}
            />
          </details>
        </div>
      </div>
    </div>
  );
}
