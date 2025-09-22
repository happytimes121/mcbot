const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const config = require('./settings.json');
const express = require('express');

// --- Web server (for uptime services like Render/UptimeRobot) ---
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

   // --- Auto Register/Login ---
   function sendRegister(password) {
      bot.chat(`/register ${password} ${password}`);
      console.log(`[Auth] Sent /register command.`);
   }

   function sendLogin(password) {
      bot.chat(`/login ${password}`);
      console.log(`[Auth] Sent /login command.`);
   }

   bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');

      // --- Auto-auth module ---
      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');
         const password = config.utils['auto-auth'].password;
         sendRegister(password);
         setTimeout(() => sendLogin(password), 2000);
      }

      // --- Chat messages module ---
      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         const messages = config.utils['chat-messages']['messages'];
         let i = 0;

         // Send first message immediately
         bot.chat(messages[i]);
         i = (i + 1) % messages.length;

         // Then every 2 minutes
         setInterval(() => {
            bot.chat(messages[i]);
            i = (i + 1) % messages.length;
         }, 2 * 60 * 1000);
      }

      // --- Move to position ---
      if (config.position.enabled) {
         const pos = config.position;
         console.log(
            `\x1b[32m[AfkBot] Moving to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      // --- Anti-AFK ---
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


createBot();


// Web server (Render/UptimeRobot ping)
const express = require('express')
const app = express()
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'))
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`))
