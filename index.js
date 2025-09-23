const mineflayer = require("mineflayer");

const bot = mineflayer.createBot({
  host: "yourserver.aternos.me", // 🔹 change to your server IP
  port: 25565,                   // 🔹 change if needed
  username: "AFKBot"             // bot username
});

// remove all chat messages
bot.on("message", () => {});

// walk forward forever once spawned
bot.once("spawn", () => {
  console.log("Bot spawned, walking forward...");
  bot.setControlState("forward", true);
});
