import dotenv from "dotenv";
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const STORY_RPC_URL = process.env.STORY_RPC_URL || "https://aeneid.storyrpc.io";
export const PRIVATE_KEY = process.env.BOT_WALLET_PRIVATE_KEY!;
export const PINATA_API_KEY = process.env.PINATA_API_KEY!;
export const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY!;
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
export const EXPLORER_BASE = process.env.EXPLORER_BASE!;
export const DATABASE_PATH = process.env.DATABASE_PATH || "./bot.db";
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
export const TEMP_DIR = process.env.TEMP_DIR || "./temp";
