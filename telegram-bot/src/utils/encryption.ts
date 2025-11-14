import crypto from "crypto";
import { ENCRYPTION_KEY } from "../config";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  // you may prefer to throw, but we keep it explicit
  console.warn("ENCRYPTION_KEY is not set or too short. Set ENCRYPTION_KEY in .env (32+ chars).");
}

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0,32)); // ensure 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12); // recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as iv:tag:ciphertext (hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
