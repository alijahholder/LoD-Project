import crypto from "node:crypto";

function key() {
  const raw = process.env.PHI_ENCRYPTION_KEY;
  if (!raw) throw new Error("PHI_ENCRYPTION_KEY not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length < 32) {
    return crypto.createHash("sha256").update(buf).digest();
  }
  return buf.subarray(0, 32);
}

export function encryptPHI(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(".");
}

export function decryptPHI(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function sha256(buf: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(typeof buf === "string" ? Buffer.from(buf, "utf8") : buf)
    .digest("hex");
}

export function randomToken(len = 32) {
  return crypto.randomBytes(len).toString("base64url");
}
