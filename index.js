const mineflayer = require("mineflayer");

let bot;
function startBot() {
  bot = mineflayer.createBot({
    host: "yourserver.aternos.me", // 🔹 change to your server IP
    port: 25565,                   // 🔹 change if needed
    username: "AFKBot"
  });

  // ignore chat messages
  bot.on("message", () => {});

  // walk forward forever once spawned
  bot.once("spawn", () => {
    console.log("Bot spawned, walking forward...");
    bot.setControlState("forward", true);
  });

  // handle disconnects
  bot.on("end", () => {
    console.log("Bot disconnected. Reconnecting in 10s...");
    setTimeout(startBot, 10 * 1000);
  });

  bot.on("kicked", (reason) => {
    console.log("Bot kicked:", reason);
  });

  bot.on("error", (err) => {
    console.log("Bot error:", err);
  });
}

// start the bot
startBot();
