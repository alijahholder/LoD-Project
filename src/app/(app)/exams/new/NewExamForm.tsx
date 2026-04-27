"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const SPECIALTIES = [
  "Orthopedic Surgery",
  "Sports Medicine",
  "Neurology",
  "Otolaryngology (ENT)",
  "Ophthalmology",
  "Audiology",
  "Other",
];

export default function NewExamForm({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [physicianName, setPhysicianName] = useState("");
  const [specialty, setSpecialty] = useState("Orthopedic Surgery");
  const [scheduledFor, setScheduledFor] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ claimId, physicianName, specialty, scheduledFor, location }),
    });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/exams/${id}`);
    }
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="phys">Physician name</Label>
        <Input id="phys" value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="spec">Specialty</Label>
        <Select id="spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="when">Date / time</Label>
        <Input id="when" type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="loc">Location</Label>
        <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button onClick={submit} disabled={busy || !physicianName}>{busy ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );
}
