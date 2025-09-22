const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const express = require('express');
const config = require('./config.json');

// --- Web server for uptime pings (like Render/UptimeRobot) ---
const app = express();
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));

function createBot() {
   const bot = mineflayer.createBot({
      username: config.bot.username,
      auth: config.bot.auth,
      host: config.server.host,
      port: config.server.port,
      version: config.server.version,
   });

   bot.loadPlugin(pathfinder);
   const mcData = require('minecraft-data')(bot.version);
   const defaultMove = new Movements(bot, mcData);

   bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');

      // --- Cracked server auth (optional) ---
      if (config.crackedAuth.enabled) {
         const password = process.env[config.crackedAuth.passwordEnvVar] || "defaultpass";

         if (config.crackedAuth.autoRegister) {
            bot.chat(config.crackedAuth.registerCommand.replace(/{password}/g, password));
            console.log("[Auth] Sent register command");
         }

         if (config.crackedAuth.autoLogin) {
            setTimeout(() => {
               bot.chat(config.crackedAuth.loginCommand.replace(/{password}/g, password));
               console.log("[Auth] Sent login command");
            }, 2000);
         }
      }

      // --- Anti-AFK chat + movement ---
      if (config.antiAfk.enabled) {
         console.log('[INFO] Anti-AFK enabled');

         // Send chat messages
         if (config.antiAfk.messages.length > 0) {
            let i = 0;

            // Send first message immediately
            bot.chat(config.antiAfk.messages[i]);
            i = (i + 1) % config.antiAfk.messages.length;

            // Then send one every chatInterval (2 min if set to 120000)
            setInterval(() => {
               bot.chat(config.antiAfk.messages[i]);
               i = (i + 1) % config.antiAfk.messages.length;
            }, config.antiAfk.chatInterval);
         }

         // Movement loop (jump every movementInterval)
         setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
         }, config.antiAfk.movementInterval);
      }
   });

   // Handle death respawn
   if (config.antiAfk.handleDeath) {
      bot.on('death', () => {
         console.log(`[AfkBot] Bot died and respawned at ${bot.entity.position}`);
      });
   }

   // --- Auto Reconnect ---
   bot.on('end', () => {
      if (config.reconnect.enabled) {
         console.log('[INFO] Bot disconnected. Reconnecting...');
         setTimeout(createBot, config.reconnect.delay || 5000);
      }
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
