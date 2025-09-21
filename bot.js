const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const config = require('./settings.json');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));

function createBot() {
   const bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);
   bot.settings.colorsEnabled = false;

   let pendingPromise = Promise.resolve();

   // --- Auto Register ---
   function sendRegister(password) {
      return new Promise((resolve) => {
         bot.chat(`/register ${password} ${password}`);
         console.log(`[Auth] Sent /register command.`);
         resolve();
      });
   }

   // --- Auto Login ---
   function sendLogin(password) {
      return new Promise((resolve) => {
         bot.chat(`/login ${password}`);
         console.log(`[Auth] Sent /login command.`);
         resolve();
      });
   }

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

      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         const messages = config.utils['chat-messages']['messages'];

         if (config.utils['chat-messages'].repeat) {
            const delay = config.utils['chat-messages']['repeat-delay'];
            let i = 0;
            setInterval(() => {
               bot.chat(messages[i]);
               i = (i + 1) % messages.length;
            }, delay * 1000);
         } else {
            messages.forEach((msg) => bot.chat(msg));
         }
      }

      if (config.position.enabled) {
         const pos = config.position;
         console.log(
            `\x1b[32m[AfkBot] Moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
         bot.setControlState('jump', true);
         if (config.utils['anti-afk'].sneak) {
            bot.setControlState('sneak', true);
         }
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot arrived at the target location: ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot died and respawned at ${bot.entity.position}\x1b[0m`
      );
   });

   // --- Auto Reconnect ---
   bot.on('end', () => {
      console.log('[INFO] Bot disconnected. Reconnecting...');
      setTimeout(createBot, config.utils['auto-reconnect-delay'] || 5000);
   });

   bot.on('kicked', (reason) => {
      console.log(`\x1b[33m[AfkBot] Bot was kicked: ${reason}\x1b[0m`);
   });

   bot.on('error', (err) => {
      console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
   });
}

createBot();


// Web server (Render/UptimeRobot ping)
const express = require('express')
const app = express()
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'))
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`))
