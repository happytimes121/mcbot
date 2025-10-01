import mineflayer from 'mineflayer';
import settings from './settings.json' assert { type: 'json' };

function startBot() {
  const bot = mineflayer.createBot({
    host: settings.server.ip,
    port: settings.server.port,
    username: settings["bot-account"].username,
    version: settings.server.version, // <---- important!
    auth: settings["bot-account"].type
  });

  bot.on('end', () => {
    console.log(`⚠️ Bot disconnected. Reconnecting in ${settings.reconnect.delay / 1000}s...`);
    setTimeout(startBot, settings.reconnect.delay);
  });

  bot.on('kicked', (reason) => console.log("❌ Bot kicked:", reason));
  bot.on('error', (err) => console.log("⚠️ Bot error:", err));
}

startBot();
