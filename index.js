const mineflayer = require('mineflayer');
const config = require('./settings.json');

function createBot() {
  const bot = mineflayer.createBot({
    username: config["bot-account"].username,
    password: config["bot-account"].password || undefined,
    auth: config["bot-account"].type,
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });

  bot.once('spawn', () => {
    console.log('[AFKBot] Bot joined the server and is now standing AFK.');
  });

  bot.on('end', () => {
    console.log('[AFKBot] Bot was disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('kicked', (reason) => {
    console.log(`[AFKBot] Kicked from server: ${reason}`);
  });

  bot.on('error', (err) => {
    console.error(`[AFKBot] Error: ${err.message}`);
  });
}

createBot();
