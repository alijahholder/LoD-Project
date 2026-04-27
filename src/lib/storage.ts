import fs from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./crypto";

export interface BlobStore {
  put(key: string, body: Buffer, mimeType: string): Promise<{ etag: string }>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

class LocalBlobStore implements BlobStore {
  constructor(private dir: string) {}
  private full(key: string) {
    const safe = key.replace(/\.\./g, "").replace(/^\/+/, "");
    return path.join(this.dir, safe);
  }
  async put(key: string, body: Buffer) {
    const f = this.full(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, body);
    return { etag: sha256(body) };
  }
  async get(key: string) {
    return fs.readFile(this.full(key));
  }
  async delete(key: string) {
    try {
      await fs.unlink(this.full(key));
    } catch {
      /* noop */
    }
  }
  async exists(key: string) {
    try {
      await fs.access(this.full(key));
      return true;
    } catch {
      return false;
    }
  }
}

let _store: BlobStore | null = null;

export function getStorage(): BlobStore {
  if (_store) return _store;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    const dir = process.env.LOCAL_STORAGE_DIR ?? "./.uploads";
    _store = new LocalBlobStore(path.resolve(dir));
    return _store;
  }
  // Future: S3 driver. Keeping interface stable.
  throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
}

export function buildStorageKey(parts: {
  claimId: string;
  kind: string;
  filename: string;
}) {
  const ts = Date.now();
  const safeName = parts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `claims/${parts.claimId}/${parts.kind}/${ts}-${safeName}`;
}
