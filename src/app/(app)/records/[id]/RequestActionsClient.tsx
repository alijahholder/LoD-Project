"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export default function RequestActionsClient({
  requestId,
  initial,
}: {
  requestId: string;
  initial: { status: string; method: string; expectedBy: string; sentAt: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [method, setMethod] = useState(initial.method);
  const [expectedBy, setExpectedBy] = useState(initial.expectedBy);
  const [sentAt, setSentAt] = useState(initial.sentAt);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/records/${requestId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, method, expectedBy, sentAt }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="drafted">drafted</option>
          <option value="sent">sent</option>
          <option value="partial">partial</option>
          <option value="complete">complete</option>
          <option value="denied">denied</option>
          <option value="escalated">escalated</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="method">Method</Label>
        <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="mail">mail</option>
          <option value="fax">fax</option>
          <option value="portal">portal</option>
          <option value="email">email</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="sent">Sent on</Label>
        <Input id="sent" type="date" value={sentAt} onChange={(e) => setSentAt(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="exp">Expected by</Label>
        <Input id="exp" type="date" value={expectedBy} onChange={(e) => setExpectedBy(e.target.value)} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
