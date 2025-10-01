import mineflayer from 'mineflayer';
import fs from 'fs';
import path from 'path';

// Load settings.json
const settingsPath = path.resolve('./settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

function startBot() {
  const bot = mineflayer.createBot({
    host: settings.server.ip,
    port: settings.server.port,
    username: settings["bot-account"].username,
    version: settings.server.version,
    auth: settings["bot-account"].type
  });

  bot.on('spawn', () => {
    console.log("✅ Bot has spawned, walking forward...");
    bot.setControlState('forward', true); // infinite forward walking
  });

  bot.on('end', () => {
    console.log(`⚠️ Bot disconnected. Reconnecting in ${settings.reconnect.delay / 1000}s...`);
    setTimeout(startBot, settings.reconnect.delay);
  });

  bot.on('kicked', (reason) => console.log("❌ Bot kicked:", reason));
  bot.on('error', (err) => console.log("⚠️ Bot error:", err));
}

startBot();
