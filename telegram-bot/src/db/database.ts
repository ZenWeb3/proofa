// src/db/database.ts
import Database from "better-sqlite3";
import { DATABASE_PATH } from "../config";
import { User } from "../types/index";

const db = new Database(DATABASE_PATH);

// Create table if missing
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE,
    wallet_address TEXT,
    private_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Insert a user (returns inserted user-like object)
export function addUser(telegramId: string, walletAddress: string, encryptedPrivateKey: string): User {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (telegram_id, wallet_address, private_key)
    VALUES (?, ?, ?)
  `);
  stmt.run(telegramId, walletAddress, encryptedPrivateKey);

  return getUser(telegramId)!;
}

export function getUser(telegramId: string): User | null {
  const stmt = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
  const row = stmt.get(telegramId);
  return (row as User) || null;
}

export function getAllUsers(): User[] {
  const stmt = db.prepare(`SELECT * FROM users`);
  return stmt.all() as User[];
}

export default db;
