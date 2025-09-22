const mineflayer = require('mineflayer');
const config = require('./settings.json');

function createBot() {
  const bot = mineflayer.createBot({
    username: config['bot-account'].username,
    password: config['bot-account'].password,
    auth: config['bot-account'].type,
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version
  });

  bot.once('spawn', () => {
    console.log('\x1b[33m[AFKBot] Bot joined the server\x1b[0m');
  });

  bot.on('end', () => {
    console.log('[INFO] Bot disconnected. Reconnecting in 10s...');
    setTimeout(createBot, config.reconnect.delay);
  });

  bot.on('kicked', reason => {
    console.log(`\x1b[33m[AFKBot] Kicked. Reason:\n${reason}\x1b[0m`);
  });

  bot.on('error', err => {
    console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
  });
}

createBot();
