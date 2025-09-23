const mineflayer = require("mineflayer");
const fs = require("fs");

let settings;
try {
  settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));
} catch (err) {
  console.error("❌ Failed to read settings.json:", err);
  process.exit(1);
}

let bot = null;

function startBot() {
  const account = settings["bot-account"];
  const server = settings.server;
  const reconnectDelay = settings.reconnect?.delay || 10000;

  bot = mineflayer.createBot({
    host: server.ip,
    port: server.port,
    username: account.username,
    password: account.password || undefined,
    auth: account.type || "offline",
    version: server.version
  });

  // Ignore chat
  bot.on("message", () => {});

  // Start walking forward when spawned
  bot.once("spawn", () => {
    console.log(`✅ Bot ${account.username} spawned. Walking forward...`);
    bot.setControlState("forward", true);
  });

  // Reconnect on disconnect
  bot.on("end", () => {
    console.log(`⚠️ Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(startBot, reconnectDelay);
  });

  // Log kick messages
  bot.on("kicked", (reason) => {
    console.log("❌ Bot kicked:", reason);
  });

  // Handle errors like EPIPE
  bot.on("error", (err) => {
    console.error("⚠️ Bot error:", err.message);
  });
}

startBot();
