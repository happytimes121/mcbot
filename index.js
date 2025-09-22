const mineflayer = require('mineflayer');
const Movements = require('mineflayer-pathfinder').Movements;
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const { GoalBlock } = require('mineflayer-pathfinder').goals;

const config = require('./settings.json');
const express = require('express');

const app = express();

// Simple webserver for Render/UptimeRobot pings
app.get('/', (req, res) => {
  res.send('🤖 AFK Bot is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));

function createBot() {
  const bot = mineflayer.createBot({
    username: config['bot-account'].username,
    password: config['bot-account'].password,
    auth: config['bot-account'].type,
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
  });

  bot.loadPlugin(pathfinder);
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.settings.colorsEnabled = false;

  let pendingPromise = Promise.resolve();

  // --- Auto register ---
  function sendRegister(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/register ${password} ${password}`);
      console.log(`[Auth] Sent /register command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);

        if (message.includes('successfully registered')) {
          console.log('[INFO] Registration confirmed.');
          resolve();
        } else if (message.includes('already registered')) {
          console.log('[INFO] Bot was already registered.');
          resolve();
        } else {
          reject(`Registration failed: "${message}"`);
        }
      });
    });
  }

  // --- Auto login ---
  function sendLogin(password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/login ${password}`);
      console.log(`[Auth] Sent /login command.`);

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`);

        if (message.includes('successfully logged in')) {
          console.log('[INFO] Login successful.');
          resolve();
        } else if (message.includes('Invalid password')) {
          reject(`Login failed: Invalid password. "${message}"`);
        } else if (message.includes('not registered')) {
          reject(`Login failed: Not registered. "${message}"`);
        } else {
          reject(`Login failed: unexpected "${message}".`);
        }
      });
    });
  }

  // --- On spawn ---
  bot.once('spawn', () => {
    console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');

    if (config.utils['auto-auth'].enabled) {
      console.log('[INFO] Started auto-auth module');

      const password = config.utils['auto-auth'].password;
      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(error => console.error('[ERROR]', error));
    }

    // Chat messages
    if (config.utils['chat-messages'].enabled) {
      console.log('[INFO] Started chat-messages module');
      const messages = config.utils['chat-messages'].messages;

      if (config.utils['chat-messages'].repeat) {
        const delay = config.utils['chat-messages']['repeat-delay'] * 1000;
        let i = 0;

        bot.chat(messages[i]); // send first immediately
        i++;

        setInterval(() => {
          if (i >= messages.length) i = 0;
          bot.chat(messages[i]);
          i++;
        }, delay);
      } else {
        messages.forEach((msg) => {
          bot.chat(msg);
        });
      }
    }

    // Pathfinding to position
    const pos = config.position;
    if (pos.enabled) {
      console.log(
        `\x1b[32m[AfkBot] Moving to target (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
      );
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
    }

    // Anti-AFK
    if (config.utils['anti-afk'].enabled) {
      bot.setControlState('jump', true);
      if (config.utils['anti-afk'].sneak) {
        bot.setControlState('sneak', true);
      }
    }
  });

  bot.on('goal_reached', () => {
    console.log(
      `\x1b[32m[AfkBot] Arrived at target. Pos: ${bot.entity.position}\x1b[0m`
    );
  });

  bot.on('death', () => {
    console.log(
      `\x1b[33m[AfkBot] Bot died, respawned at ${bot.entity.position}\x1b[0m`
    );
  });

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      setTimeout(() => {
        createBot();
      }, config.utils['auto-recconect-delay']);
    });
  }

  bot.on('kicked', (reason) =>
    console.log(
      '\x1b[33m',
      `[AfkBot] Kicked. Reason: \n${reason}`,
      '\x1b[0m'
    )
  );

  bot.on('error', (err) =>
    console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`)
  );
}

createBot();
