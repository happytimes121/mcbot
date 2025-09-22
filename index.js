const mineflayer = require('mineflayer');
const { Movements, pathfinder, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const express = require('express');
const config = require('./settings.json');

const app = express();

// Web server for Render/UptimeRobot pings
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'));
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

    // Auto Register/Login
    function sendRegister(password) {
        return new Promise((resolve, reject) => {
            bot.chat(`/register ${password} ${password}`);
            console.log(`[Auth] Sent /register command`);

            bot.once('chat', (username, message) => {
                console.log(`[ChatLog] <${username}> ${message}`);
                if (message.includes('successfully registered') || message.includes('already registered')) {
                    resolve();
                } else {
                    reject(`Registration failed: "${message}"`);
                }
            });
        });
    }

    function sendLogin(password) {
        return new Promise((resolve, reject) => {
            bot.chat(`/login ${password}`);
            console.log(`[Auth] Sent /login command`);

            bot.once('chat', (username, message) => {
                console.log(`[ChatLog] <${username}> ${message}`);
                if (message.includes('successfully logged in')) {
                    resolve();
                } else {
                    reject(`Login failed: "${message}"`);
                }
            });
        });
    }

    // On spawn
    bot.once('spawn', () => {
        console.log('\x1b[33m[AfkBot] Bot joined the server\x1b[0m');

        // Auto-auth
        if (config.utils['auto-auth'].enabled) {
            const password = config.utils['auto-auth'].password;
            pendingPromise = pendingPromise
                .then(() => sendRegister(password))
                .then(() => sendLogin(password))
                .catch(err => console.error('[ERROR]', err));
        }

        // Anti-AFK chat
        if (config.utils['chat-messages'].enabled && config.utils['chat-messages'].messages.length > 0) {
            const messages = config.utils['chat-messages'].messages;
            let i = 0;

            // Send first message immediately
            bot.chat(messages[i]);
            i++;

            // Send one message every 2 minutes
            setInterval(() => {
                if (i >= messages.length) i = 0;
                bot.chat(messages[i]);
                i++;
            }, config.utils['chat-messages']['repeat-delay'] * 1000); // repeat-delay in seconds
        }

        // Pathfinder movement
        const pos = config.position;
        if (pos.enabled) {
            console.log(`\x1b[32m[AfkBot] Moving to target (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`);
            bot.pathfinder.setMovements(defaultMove);
            bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
        }

        // Anti-AFK movement
        if (config.utils['anti-afk'].enabled) {
            bot.setControlState('jump', true);
            if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
        }
    });

    bot.on('goal_reached', () => {
        console.log(`\x1b[32m[AfkBot] Arrived at target. Pos: ${bot.entity.position}\x1b[0m`);
    });

    bot.on('death', () => {
        console.log(`\x1b[33m[AfkBot] Bot died, respawned at ${bot.entity.position}\x1b[0m`);
    });

    // Auto-reconnect
    if (config.utils['auto-reconnect']) {
        bot.on('end', () => {
            console.log('[INFO] Bot disconnected. Reconnecting...');
            setTimeout(createBot, config.utils['auto-recconect-delay']);
        });
    }

    bot.on('kicked', reason => {
        console.log(`\x1b[33m[AfkBot] Kicked. Reason:\n${reason}\x1b[0m`);
    });

    bot.on('error', err => {
        console.log(`\x1b[31m[ERROR] ${err.message}\x1b[0m`);
    });
}

createBot();
