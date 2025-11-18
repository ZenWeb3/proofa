
import TelegramBot from "node-telegram-bot-api";
import { JsonRpcProvider, Contract } from "ethers";
import { STORY_RPC_URL, CONTRACT_ADDRESS } from "../config";
import { getAllUsers } from "../db/database";
import IPRegistryABI from "../../../smart-contract/artifacts/contracts/IPRegistry.sol/IPRegistry.json";

// Track all user wallets and their balances
const userWallets = new Map<string, string>(); // wallet -> telegramId
const lastBalances = new Map<string, bigint>(); // wallet -> balance

export function startBalanceMonitor(bot: TelegramBot) {
  console.log("🔔 Starting event listeners...");

  // Load all users and their initial balances
  try {
    const users = getAllUsers();
    users.forEach((user) => {
      userWallets.set(user.wallet_address.toLowerCase(), user.telegram_id);
    });
    console.log(`📋 Monitoring ${users.length} wallets`);
  } catch (err) {
    console.error("Error loading users:", err);
  }

  // Initialize provider with retry
  let provider: JsonRpcProvider;
  let contract: Contract;

  try {
    provider = new JsonRpcProvider(STORY_RPC_URL);
    contract = new Contract(CONTRACT_ADDRESS, IPRegistryABI.abi, provider);

    // 1. Listen for AssetRegistered events (instant!)
    contract.on(
      "AssetRegistered",
      async (id, owner, ipfsHash, assetType, timestamp) => {
        try {
          const telegramId = userWallets.get(owner.toLowerCase());

          if (telegramId) {
            await bot.sendMessage(
              telegramId,
              `🎉 *Asset Registered!*\n\n🆔 Asset ID: ${id}\n📦 Type: ${assetType}\n\n✅ Your work is now protected on-chain!`,
              { parse_mode: "Markdown" }
            );
            console.log(`✅ Notified user ${telegramId} of asset registration`);
          }
        } catch (err) {
          console.error("Notification error:", err);
        }
      }
    );

    // 2. Monitor balance changes (check every block)
    provider.on("block", async (blockNumber) => {
      try {
        // Check each user's balance
        for (const [wallet, telegramId] of userWallets.entries()) {
          try {
            const currentBalance = await provider.getBalance(wallet);
            const lastBalance = lastBalances.get(wallet) || 0n;

            // Balance changed!
            if (currentBalance !== lastBalance && lastBalance !== 0n) {
              const diff = currentBalance - lastBalance;
              const diffIP = (Number(diff) / 1e18).toFixed(4);
              const currentIP = (Number(currentBalance) / 1e18).toFixed(4);

              if (diff > 0n) {
                // Funds received
                await bot.sendMessage(
                  telegramId,
                  `💰 *Funds Received!*\n\n+${diffIP} IP\n💼 Balance: ${currentIP} IP\n\n✅ You can now register assets!`,
                  { parse_mode: "Markdown" }
                );
                console.log(`✅ Notified user ${telegramId} of +${diffIP} IP`);
              } else {
                // Funds spent (gas)
                await bot.sendMessage(
                  telegramId,
                  `⚡ *Transaction Completed*\n\n${diffIP} IP (gas fee)\n💼 Balance: ${currentIP} IP`,
                  { parse_mode: "Markdown" }
                );
                console.log(
                  `✅ Notified user ${telegramId} of ${diffIP} IP spent`
                );
              }
            }

            // Update last balance
            lastBalances.set(wallet, currentBalance);
          } catch (err) {
            // Skip this wallet if error
          }
        }
      } catch (err) {
        // Silent fail for block monitoring
      }
    });

    console.log(
      "✅ Event listeners active (Asset registration + Balance tracking)"
    );
  } catch (err) {
    console.error("⚠️ Event listener setup failed (will retry):", err);
    // Retry after 10 seconds
    setTimeout(() => startBalanceMonitor(bot), 10000);
  }
}

// Update user list when new users join
export function addUserToMonitor(walletAddress: string, telegramId: string) {
  userWallets.set(walletAddress.toLowerCase(), telegramId);
  console.log(`📝 Added wallet to monitor: ${walletAddress}`);
}
