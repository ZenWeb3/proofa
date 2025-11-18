import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

import startCommand from "./commands/start";
import registerCommand from "./commands/register";
import myAssetsCommand from "./commands/myassets";
import verifyCommand from "./commands/verify";
import assetsByAddressCommand from "./commands/assetsByAddress";
import { startBalanceMonitor } from "./services/balanceMonitor";
import balanceCommand from "./commands/balance";
import transferCommand from "./commands/transfer";
import licenseCommand from "./commands/license";
import { TEMP_DIR } from "./config";

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let bot: TelegramBot;
let errorCount = 0;
const MAX_ERRORS_BEFORE_RESTART = 10;

function startBot() {
  bot = new TelegramBot(process.env.BOT_TOKEN!, {
    polling: {
      interval: 2000,
      autoStart: true,
      params: {
        timeout: 20,
      },
    },
  });

  bot.on("polling_error", (error) => {
    errorCount++;

    if (errorCount <= 3) {
      console.log(`⚠️ Connection issue (${errorCount})`);
    }

    if (errorCount >= MAX_ERRORS_BEFORE_RESTART) {
      console.log("🔄 Too many errors, restarting bot...");
      bot.stopPolling();
      errorCount = 0;
      setTimeout(startBot, 5000);
      return;
    }
  });

  bot.on("message", () => {
    errorCount = 0;
  });

  // Register all commands
  startCommand(bot);
  registerCommand(bot);
  myAssetsCommand(bot);
  assetsByAddressCommand(bot);
  verifyCommand(bot);
  startBalanceMonitor(bot);
  balanceCommand(bot);
  transferCommand(bot);
  licenseCommand(bot)

  console.log("✅ Bot is running (connection issues will auto-recover)");
}

startBot();

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});
