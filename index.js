const mineflayer = require('mineflayer');
const fs = require('fs');

// Load settings
let settings;
try {
  settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
} catch (err) {
  console.error('Failed to read settings.json:', err);
  process.exit(1);
}

let bot = null;

function startBot() {
  const account = settings['bot-account'];
  const server = settings.server;
  const reconnectDelay = settings.reconnect?.delay || 10000;

  bot = mineflayer.createBot({
    host: server.ip,
    port: server.port,
    username: account.username,
    password: account.password || undefined,
    auth: account.type || 'offline',
    version: server.version
  });

  // ignore all chat messages
  bot.on('message', () => {});

  bot.once('spawn', () => {
    console.log(`Bot spawned as ${account.username}, walking forward...`);
    bot.setControlState('forward', true);
  });

  bot.on('end', () => {
    console.log(`Bot disconnected. Reconnecting in ${reconnectDelay / 1000} seconds...`);
    setTimeout(startBot, reconnectDelay);
  });

  bot.on('kicked', (reason) => {
    console.log('Bot was kicked:', reason);
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err);
  });
}

// start the bot
startBot();
