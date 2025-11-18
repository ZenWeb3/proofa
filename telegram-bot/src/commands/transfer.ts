// src/commands/transfer.ts
import TelegramBot from "node-telegram-bot-api";
import { getUser } from "../db/database";
import { getUserDecryptedPrivateKey } from "../services/wallet";
import {
  transferAssetOnChain,
  getCertificateOnChain,
} from "../utils/blockchain-simple";

// Track transfer state per user
const transferState = new Map<
  string,
  { step: "await_id" | "await_recipient"; assetId?: number }
>();

export default function transferCommand(bot: TelegramBot) {
  // Step 1: Start transfer command
  bot.onText(/\/transfer/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const user = getUser(telegramId);
    if (!user) {
      await bot.sendMessage(
        chatId,
        "❌ *Wallet Not Found*\n\nPlease send /start first to create your wallet.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `📤 *Transfer Asset*\n\n` +
        `Step 1 of 2: Which asset do you want to transfer?\n\n` +
        `Please send the *Asset ID*\n\n` +
        `💡 Use /myassets to see your assets\n` +
        `📝 Or send /cancel to exit`,
      { parse_mode: "Markdown" }
    );

    transferState.set(chatId, { step: "await_id" });
  });

  // Step 2: Handle user input
  bot.on("message", async (msg) => {
    if (!msg?.chat || !msg.text) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const state = transferState.get(chatId);
    if (!state) return; // Not in transfer flow

    const text = msg.text.trim();

    // Handle cancel
    if (text.toLowerCase() === "/cancel") {
      transferState.delete(chatId);
      await bot.sendMessage(chatId, "✅ Transfer cancelled.");
      return;
    }

    // Step 1: Awaiting Asset ID
    if (state.step === "await_id") {
      const assetId = parseInt(text);

      if (isNaN(assetId) || assetId < 1) {
        await bot.sendMessage(
          chatId,
          "❌ Please send a valid Asset ID (positive number)\n\n💡 Use /myassets or send /cancel"
        );
        return;
      }

      const user = getUser(telegramId);
      if (!user) {
        transferState.delete(chatId);
        await bot.sendMessage(
          chatId,
          "❌ Session expired. Please send /transfer again."
        );
        return;
      }

      // Verify ownership
      try {
        await bot.sendMessage(chatId, "🔍 Verifying ownership...");

        const cert = await getCertificateOnChain(assetId);

        if (cert.owner.toLowerCase() !== user.wallet_address.toLowerCase()) {
          transferState.delete(chatId);
          await bot.sendMessage(
            chatId,
            `❌ *You Don't Own This Asset*\n\n` +
              `Asset #${assetId} is owned by:\n\`${cert.owner}\`\n\n` +
              `You can only transfer assets you own.`,
            { parse_mode: "Markdown" }
          );
          return;
        }

        // Show asset details and ask for recipient
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`;

        await bot.sendMessage(
          chatId,
          `✅ *Ownership Verified*\n\n` +
            `📦 Asset #${assetId}\n` +
            `🎨 Type: ${cert.assetType}\n` +
            `🔗 [View on IPFS](${ipfsUrl})\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `Step 2 of 2: Who should receive this asset?\n\n` +
            `Please send the *recipient's wallet address*\n\n` +
            `📝 Format: 0x123abc...\n` +
            `📝 Or send /cancel to exit`,
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }
        );

        // Update state
        transferState.set(chatId, { step: "await_recipient", assetId });
      } catch (err: any) {
        transferState.delete(chatId);
        console.error("Ownership verification error:", err);

        if (err.message?.includes("Asset not found")) {
          await bot.sendMessage(chatId, `❌ Asset #${assetId} does not exist.`);
        } else {
          await bot.sendMessage(
            chatId,
            "❌ Failed to verify ownership. Network issue - try again."
          );
        }
      }
      return;
    }

    // Step 2: Awaiting Recipient Address
    if (state.step === "await_recipient") {
      const recipient = text.trim();

      // Validate address format
      if (
        !recipient.startsWith("0x") ||
        recipient.length !== 42 ||
        !/^0x[a-fA-F0-9]{40}$/.test(recipient)
      ) {
        await bot.sendMessage(
          chatId,
          "❌ *Invalid Wallet Address*\n\n" +
            "Address must:\n" +
            "• Start with 0x\n" +
            "• Be 42 characters long\n" +
            "• Contain only hex characters\n\n" +
            "Try again or send /cancel",
          { parse_mode: "Markdown" }
        );
        return;
      }

      const user = getUser(telegramId);
      if (!user) {
        transferState.delete(chatId);
        await bot.sendMessage(
          chatId,
          "❌ Session expired. Please send /transfer again."
        );
        return;
      }

      // Check if transferring to self
      if (recipient.toLowerCase() === user.wallet_address.toLowerCase()) {
        await bot.sendMessage(
          chatId,
          "❌ *Cannot Transfer to Yourself*\n\nYou already own this asset!\n\nTry again or send /cancel",
          { parse_mode: "Markdown" }
        );
        return;
      }

      const privateKey = getUserDecryptedPrivateKey(telegramId);
      if (!privateKey) {
        transferState.delete(chatId);
        await bot.sendMessage(
          chatId,
          "❌ Could not decrypt your wallet. Please contact support."
        );
        return;
      }

      const assetId = state.assetId!;

      try {
        // Execute transfer
        await bot.sendMessage(
          chatId,
          `⏳ *Processing Transfer*\n\n` +
            `Transferring Asset #${assetId} to:\n\`${recipient}\`\n\n` +
            `Please wait...`,
          { parse_mode: "Markdown" }
        );

        const txHash = await transferAssetOnChain(
          privateKey,
          assetId,
          recipient
        );

        // Get updated certificate
        const cert = await getCertificateOnChain(assetId);

        // Success!
        await bot.sendMessage(
          chatId,
          `✅ *Transfer Complete!*\n\n` +
            `🎉 Asset #${assetId} successfully transferred!\n\n` +
            `📝 *Details:*\n` +
            `• Type: ${cert.assetType}\n` +
            `• New Owner: \`${recipient}\`\n` +
            `• Transaction: \`${txHash}\`\n\n` +
            `🔗 [View Transaction](https://aeneid.storyscan.xyz/tx/${txHash})\n\n` +
            `⚠️ *Note:* You no longer own this asset.`,
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
          }
        );
      } catch (err: any) {
        console.error("Transfer error:", err);

        let errorMsg = "❌ *Transfer Failed*\n\n";

        if (err.message === "INSUFFICIENT_FUNDS") {
          errorMsg +=
            "Not enough IP tokens for gas fees.\n\n💡 Use /fund to get more IP.";
        } else if (err.message?.includes("timeout")) {
          errorMsg += "Network timeout. Please try again.";
        } else {
          errorMsg += `${
            err.message || "Unknown error"
          }\n\n💡 Try /transfer again.`;
        }

        await bot.sendMessage(chatId, errorMsg, { parse_mode: "Markdown" });
      } finally {
        transferState.delete(chatId);
      }
      return;
    }
  });

  // Cancel handler
  bot.onText(/\/cancel/, (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    if (transferState.has(chatId)) {
      transferState.delete(chatId);
      bot.sendMessage(chatId, "✅ Transfer cancelled.");
    }
  });
}
