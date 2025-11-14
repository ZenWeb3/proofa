import {
  createWalletForUser,
  getUserDecryptedPrivateKey,
} from "../services/wallet";
import { getUser } from "../db/database";

async function run() {
  const telegramId = "test-1234";
  const user = createWalletForUser(telegramId);
  console.log("Stored user:", user);

  const pk = getUserDecryptedPrivateKey(telegramId);
  console.log("Decrypted private key (should start with 0x):", pk);
}

run().catch(console.error);
