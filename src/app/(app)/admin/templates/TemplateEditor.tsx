"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export default function TemplateEditor({ id, initialBody }: { id: string; initialBody: string }) {
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/templates/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSaving(false);
    setSuccess(res.ok ? "Saved." : "Save failed.");
    setTimeout(() => setSuccess(null), 2000);
  }

  return (
    <div className="space-y-3">
      <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-600">Slots: <code>{`{{playerName}} {{providerName}} {{dateRangeStart}} {{dateRangeEnd}} {{recipientBlock}} {{expirationDate}} {{dob}} {{claimId}} {{deniedAt}} {{appealDeadline}}`}</code></p>
        <div className="flex items-center gap-2">
          {success ? <span className="text-xs text-emerald-700">{success}</span> : null}
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
