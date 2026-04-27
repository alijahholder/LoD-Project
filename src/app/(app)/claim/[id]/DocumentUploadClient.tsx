"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/input";
import { Upload } from "lucide-react";

export default function DocumentUploadClient({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [source, setSource] = useState("player_upload");
  const [providerName, setProviderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    setProgress(`Uploading ${files.length} file(s)…`);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("source", source);
        if (providerName) fd.append("providerName", providerName);
        const res = await fetch(`/api/claim/${claimId}/upload`, { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Upload failed for ${f.name}`);
        setProgress(`Processing ${f.name}…`);
        const json = await res.json();
        // Trigger AI pipeline synchronously for v1; in prod this is queued.
        await fetch(`/api/claim/${claimId}/documents/${json.documentId}/process`, { method: "POST" });
      }
      setProgress(null);
      setBusy(false);
      router.refresh();
    } catch (e) {
      setBusy(false);
      setProgress(null);
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="src">Document source</Label>
          <Select id="src" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="player_upload">Personal upload</option>
            <option value="nfl_club">NFL Club records</option>
            <option value="third_party_provider">Third-party provider</option>
            <option value="plan_correspondence">Plan correspondence</option>
            <option value="denial_letter">Denial letter</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="provider">Provider name (optional)</Label>
          <input
            id="provider"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className="w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-brand-200 bg-brand-50/50 p-6 text-center hover:bg-brand-50">
        <Upload className="h-6 w-6 text-brand-700" />
        <span className="text-sm font-medium text-brand-900">
          {files && files.length > 0 ? `${files.length} file(s) selected` : "Choose files to upload"}
        </span>
        <span className="text-xs text-brand-600">PDF, JPG, PNG, TXT — max 25 MB each</span>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.txt,.md,application/pdf,image/jpeg,image/png,text/plain"
          className="hidden"
          onChange={(e) => setFiles(e.target.files)}
        />
      </label>

      {progress ? <p className="text-sm text-brand-700">{progress}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button onClick={upload} disabled={busy || !files || files.length === 0}>
        {busy ? "Working…" : "Upload & analyze"}
      </Button>
    </div>
  );
}
