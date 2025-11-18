// src/commands/license.ts
import TelegramBot from "node-telegram-bot-api";
import { getUser } from "../db/database";
import { getUserDecryptedPrivateKey } from "../services/wallet";
import {
  setLicenseOnChain,
  getCertificateOnChain,
  getLicenseOnChain,
} from "../utils/blockchain-simple";

// Track license state per user
const licenseState = new Map<
  string,
  {
    step: "await_id" | "await_price" | "await_type" | "await_royalty";
    assetId?: number;
    price?: string;
    isCommercial?: boolean;
  }
>();

export default function licenseCommand(bot: TelegramBot) {
  // Step 1: Start license command
  bot.onText(/\/license/, async (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const user = getUser(telegramId);
    if (!user) {
      await bot.sendMessage(
        chatId,
        "❌ Please send /start first to create your wallet.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `💰 *Set License Terms*\n\n` +
        `Step 1 of 4: Which asset do you want to license?\n\n` +
        `Please send the *Asset ID*\n\n` +
        `💡 Use /myassets to see your assets\n` +
        `📝 Or send /cancel to exit`,
      { parse_mode: "Markdown" }
    );

    licenseState.set(chatId, { step: "await_id" });
  });

  // Step 2: Handle user input
  bot.on("message", async (msg) => {
    if (!msg?.chat || !msg.text) return;
    const chatId = String(msg.chat.id);
    const telegramId = String(msg.from?.id);

    const state = licenseState.get(chatId);
    if (!state) return;

    const text = msg.text.trim();

    if (text.toLowerCase() === "/cancel") {
      licenseState.delete(chatId);
      await bot.sendMessage(chatId, "✅ Licensing cancelled.");
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
        licenseState.delete(chatId);
        await bot.sendMessage(
          chatId,
          "❌ Session expired. Please send /license again."
        );
        return;
      }

      try {
        await bot.sendMessage(chatId, "🔍 Verifying ownership...");

        const cert = await getCertificateOnChain(assetId);

        if (cert.owner.toLowerCase() !== user.wallet_address.toLowerCase()) {
          licenseState.delete(chatId);
          await bot.sendMessage(
            chatId,
            `❌ You don't own Asset #${assetId}\n\nYou can only set licenses for assets you own.`
          );
          return;
        }

        // Check current license
        try {
          const currentLicense = await getLicenseOnChain(assetId);
          const hasLicense = currentLicense.price > 0n;

          await bot.sendMessage(
            chatId,
            `✅ *Asset Verified*\n\n` +
              `📦 Asset #${assetId} - ${cert.assetType}\n` +
              (hasLicense
                ? `📋 Current License: ${(
                    Number(currentLicense.price) / 1e18
                  ).toFixed(4)} IP\n`
                : `📋 No license set yet\n`) +
              `\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `Step 2 of 4: Set the license price\n\n` +
              `How much should it cost to license this asset?\n\n` +
              `💡 Examples:\n` +
              `• 0.01 (free to use)\n` +
              `• 0.1 (affordable)\n` +
              `• 1.0 (premium)\n\n` +
              `📝 Enter price in IP tokens or send /cancel`,
            { parse_mode: "Markdown" }
          );
        } catch (err) {
          // No existing license, continue
          await bot.sendMessage(
            chatId,
            `✅ *Asset Verified*\n\n` +
              `📦 Asset #${assetId} - ${cert.assetType}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `Step 2 of 4: Set the license price\n\n` +
              `How much should it cost to license this asset?\n\n` +
              `💡 Examples: 0.01, 0.1, 1.0\n\n` +
              `📝 Enter price in IP tokens or send /cancel`,
            { parse_mode: "Markdown" }
          );
        }

        licenseState.set(chatId, { ...state, step: "await_price", assetId });
      } catch (err: any) {
        licenseState.delete(chatId);
        console.error("Ownership verification error:", err);
        await bot.sendMessage(
          chatId,
          "❌ Failed to verify ownership. Try again."
        );
      }
      return;
    }

    // Step 2: Awaiting Price
    if (state.step === "await_price") {
      const price = parseFloat(text);

      if (isNaN(price) || price < 0) {
        await bot.sendMessage(
          chatId,
          "❌ Please enter a valid price (0 or positive number)\n\n💡 Example: 0.1"
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `💰 Price set: ${price} IP\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Step 3 of 4: License type\n\n` +
          `Can this be used for commercial purposes?\n\n` +
          `Type *yes* for commercial use\n` +
          `Type *no* for personal use only`,
        { parse_mode: "Markdown" }
      );

      licenseState.set(chatId, { ...state, step: "await_type", price: text });
      return;
    }

    // Step 3: Awaiting License Type
    if (state.step === "await_type") {
      const input = text.toLowerCase();

      if (input !== "yes" && input !== "no") {
        await bot.sendMessage(chatId, "❌ Please type *yes* or *no*", {
          parse_mode: "Markdown",
        });
        return;
      }

      const isCommercial = input === "yes";

      await bot.sendMessage(
        chatId,
        `${isCommercial ? "💼" : "👤"} ${
          isCommercial ? "Commercial" : "Personal"
        } use selected\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Step 4 of 4: Royalty percentage\n\n` +
          `What percentage royalty on resales?\n\n` +
          `💡 Common royalties:\n` +
          `• 0 - No royalties\n` +
          `• 5 - Standard\n` +
          `• 10 - High\n` +
          `• 15 - Premium\n\n` +
          `📝 Enter number between 0-100`,
        { parse_mode: "Markdown" }
      );

      licenseState.set(chatId, {
        ...state,
        step: "await_royalty",
        isCommercial,
      });
      return;
    }

    // Step 4: Awaiting Royalty
    if (state.step === "await_royalty") {
      const royalty = parseInt(text);

      if (isNaN(royalty) || royalty < 0 || royalty > 100) {
        await bot.sendMessage(
          chatId,
          "❌ Please enter a number between 0 and 100"
        );
        return;
      }

      const user = getUser(telegramId);
      const privateKey = getUserDecryptedPrivateKey(telegramId);

      if (!user || !privateKey) {
        licenseState.delete(chatId);
        await bot.sendMessage(chatId, "❌ Session expired. Please try again.");
        return;
      }

      const { assetId, price, isCommercial } = state;

      try {
        await bot.sendMessage(
          chatId,
          `⏳ *Setting License Terms...*\n\n` +
            `📋 Summary:\n` +
            `• Asset: #${assetId}\n` +
            `• Price: ${price} IP\n` +
            `• Type: ${isCommercial ? "Commercial" : "Personal"}\n` +
            `• Royalty: ${royalty}%\n\n` +
            `Please wait...`,
          { parse_mode: "Markdown" }
        );

        const priceInWei = BigInt(Math.floor(parseFloat(price!) * 1e18));
        const txHash = await setLicenseOnChain(
          privateKey,
          assetId!,
          priceInWei.toString(),
          isCommercial!,
          royalty
        );

        await bot.sendMessage(
          chatId,
          `✅ *License Terms Set!*\n\n` +
            `🎉 Asset #${assetId} is now available for licensing!\n\n` +
            `📋 *Terms:*\n` +
            `• Price: ${price} IP\n` +
            `• Usage: ${
              isCommercial ? "Commercial ✅" : "Personal only 👤"
            }\n` +
            `• Royalty: ${royalty}%\n\n` +
            `🔗 Transaction: \`${txHash}\`\n\n` +
            `💰 Others can now license your work!`,
          { parse_mode: "Markdown" }
        );
      } catch (err: any) {
        console.error("License setting error:", err);

        let errorMsg = "❌ *Failed to Set License*\n\n";

        if (err.message === "INSUFFICIENT_FUNDS") {
          errorMsg += "Not enough IP tokens for gas.\n\n💡 Use /fund";
        } else {
          errorMsg += `${
            err.message || "Unknown error"
          }\n\n💡 Try /license again`;
        }

        await bot.sendMessage(chatId, errorMsg, { parse_mode: "Markdown" });
      } finally {
        licenseState.delete(chatId);
      }
      return;
    }
  });

  bot.onText(/\/cancel/, (msg) => {
    if (!msg?.chat) return;
    const chatId = String(msg.chat.id);

    if (licenseState.has(chatId)) {
      licenseState.delete(chatId);
      bot.sendMessage(chatId, "✅ Licensing cancelled.");
    }
  });
}
