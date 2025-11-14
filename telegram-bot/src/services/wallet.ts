import { Wallet } from "ethers";
import { addUser, getUser } from "../db/database";
import { encrypt, decrypt } from "../utils/encryption";
import { User } from "../types/index";

/**
 * Create a new wallet for a Telegram user and store it encrypted.
 * If the user exists, returns the DB row (User).
 */
export function createWalletForUser(telegramId: string): User {
  // 1. If user exists, return it
  const existing = getUser(telegramId);
  if (existing) return existing;

  // 2. Create new wallet
  const wallet = Wallet.createRandom(); // { address, privateKey }

  // 3. Encrypt privateKey (string) before storing
  const encrypted = encrypt(wallet.privateKey); // returns string like iv:tag:ct

  // 4. Insert into DB (addUser returns the stored row)
  const inserted = addUser(telegramId, wallet.address, encrypted);

  // 5. Return the stored user row
  return inserted;
}

/**
 * Return the decrypted private key for a user (server-side only).
 * Returns null if user not found or decryption fails.
 */
export function getUserDecryptedPrivateKey(telegramId: string): string | null {
  const user = getUser(telegramId);
  if (!user) return null;

  try {
    const decrypted = decrypt(user.private_key); // decrypt the encrypted string
    return decrypted; // returns privateKey like "0xabc..."
  } catch (err) {
    console.error("Failed to decrypt private key for", telegramId, err);
    return null;
  }
}
