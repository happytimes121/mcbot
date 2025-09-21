const mineflayer = require('mineflayer')
const fs = require('fs')

// Load configuration
let config
try {
  config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
} catch (error) {
  console.error('Error loading config.json:', error.message)
  process.exit(1)
}

let bot = null
let reconnectTimeout = null
let movementInterval = null
let chatInterval = null
let retryCount = 0
let isAuthenticated = false

function createBot() {
  console.log(`Attempting to connect to ${config.server.host}:${config.server.port}...`)
  
  bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    auth: config.bot.auth,
    version: config.server.version
  })

  bot.on('login', () => {
    console.log(`✓ Bot logged in as ${bot.username}`)
    console.log(`✓ Connected to server: ${config.server.host}:${config.server.port}`)
    retryCount = 0
    isAuthenticated = false
  })

  bot.on('spawn', () => {
    console.log('✓ Bot spawned in the world')
    console.log(`Position: ${bot.entity.position}`)
    
    // Start anti-AFK features
    if (config.antiAfk.enabled) {
      startAntiAfkFeatures()
    }
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    console.log(`[CHAT] ${username}: ${message}`)
    
    // Handle cracked server authentication
    if (config.crackedAuth.enabled && !isAuthenticated) {
      handleAuthentication(message)
    }
  })

  bot.on('error', (err) => {
    console.error('❌ Bot error:', err.message)
  })

  bot.on('end', (reason) => {
    console.log('❌ Bot disconnected:', reason)
    handleDisconnect()
  })

  bot.on('kicked', (reason) => {
    console.log('❌ Bot was kicked:', reason)
  })

  bot.on('death', () => {
    if (config.antiAfk.handleDeath) {
      console.log('💀 Bot died, respawning...')
      setTimeout(() => {
        bot.respawn()
      }, 2000)
    }
  })
}

function handleAuthentication(message) {
  if (!config.crackedAuth.enabled) return
  
  const password = process.env[config.crackedAuth.passwordEnvVar]
  if (!password) {
    console.log('⚠️ Cracked auth enabled but no password found in environment variable:', config.crackedAuth.passwordEnvVar)
    return
  }

  // Check for common authentication prompts
  const lowerMessage = message.toLowerCase()
  
  if (config.crackedAuth.autoRegister && (lowerMessage.includes('register') || lowerMessage.includes('/register'))) {
    const registerCmd = config.crackedAuth.registerCommand.replace(/{password}/g, password)
    bot.chat(registerCmd)
    console.log('📝 Sent registration command')
    isAuthenticated = true
  } else if (config.crackedAuth.autoLogin && (lowerMessage.includes('login') || lowerMessage.includes('/login'))) {
    const loginCmd = config.crackedAuth.loginCommand.replace(/{password}/g, password)
    bot.chat(loginCmd)
    console.log('🔑 Sent login command')
    isAuthenticated = true
  }
}

let walkingPattern = 'circle'
let walkingStep = 0
let isWalking = false

function performWalkingPattern() {
  if (isWalking) return // Prevent overlapping movements
  
  isWalking = true
  walkingStep++
  
  // Switch patterns occasionally for variety
  if (walkingStep % 20 === 0) {
    const patterns = ['circle', 'square', 'back_forth', 'random_walk']
    walkingPattern = patterns[Math.floor(Math.random() * patterns.length)]
    walkingStep = 1
  }
  
  switch(walkingPattern) {
    case 'circle':
      performCircleWalk()
      break
    case 'square':
      performSquareWalk()
      break
    case 'back_forth':
      performBackForthWalk()
      break
    case 'random_walk':
      performRandomWalk()
      break
  }
}

function performCircleWalk() {
  // Walk in a circle by turning slightly and moving forward
  const angle = (walkingStep * 18) * (Math.PI / 180) // 18 degrees per step
  bot.look(angle, 0)
  
  bot.setControlState('forward', true)
  setTimeout(() => {
    bot.setControlState('forward', false)
    isWalking = false
  }, 1500)
}

function performSquareWalk() {
  // Walk in a square pattern
  const direction = Math.floor((walkingStep - 1) / 5) % 4 // 5 steps per side
  const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2] // N, E, S, W
  
  bot.look(angles[direction], 0)
  
  bot.setControlState('forward', true)
  setTimeout(() => {
    bot.setControlState('forward', false)
    isWalking = false
  }, 1000)
}

function performBackForthWalk() {
  // Walk back and forth
  const forward = (walkingStep % 10) < 5
  
  if (forward) {
    bot.look(0, 0) // North
    bot.setControlState('forward', true)
  } else {
    bot.look(Math.PI, 0) // South
    bot.setControlState('forward', true)
  }
  
  setTimeout(() => {
    bot.setControlState('forward', false)
    isWalking = false
  }, 1200)
}

function performRandomWalk() {
  // Random direction and movement
  const randomYaw = Math.random() * 2 * Math.PI
  const randomPitch = (Math.random() - 0.5) * 0.3
  
  bot.look(randomYaw, randomPitch)
  
  // Mix of different movements
  const movements = [
    () => { bot.setControlState('forward', true); return 'forward' },
    () => { bot.setControlState('back', true); return 'back' },
    () => { bot.setControlState('left', true); return 'strafe left' },
    () => { bot.setControlState('right', true); return 'strafe right' },
    () => { 
      bot.setControlState('jump', true)
      bot.setControlState('forward', true)
      return 'jump forward'
    }
  ]
  
  const movement = movements[Math.floor(Math.random() * movements.length)]
  const action = movement()
  
  setTimeout(() => {
    bot.setControlState('forward', false)
    bot.setControlState('back', false)
    bot.setControlState('left', false)
    bot.setControlState('right', false)
    bot.setControlState('jump', false)
    isWalking = false
  }, 800)
}

function startAntiAfkFeatures() {
  console.log('🔄 Starting anti-AFK features...')
  
  // Enhanced movement patterns to prevent AFK kick
  if (config.antiAfk.movementInterval > 0) {
    movementInterval = setInterval(() => {
      if (bot && bot.entity) {
        performWalkingPattern()
        console.log(`🚶 Walking pattern: ${walkingPattern} (step ${walkingStep})`)
      }
    }, config.antiAfk.movementInterval)
  }

  // Occasional chat messages
  if (config.antiAfk.chatInterval > 0 && config.antiAfk.messages.length > 0) {
    chatInterval = setInterval(() => {
      if (bot && bot.entity) {
        const randomMessage = config.antiAfk.messages[Math.floor(Math.random() * config.antiAfk.messages.length)]
        bot.chat(randomMessage)
        console.log('💬 Sent anti-AFK message:', randomMessage)
      }
    }, config.antiAfk.chatInterval)
  }
}

function stopAntiAfkFeatures() {
  if (movementInterval) {
    clearInterval(movementInterval)
    movementInterval = null
  }
  if (chatInterval) {
    clearInterval(chatInterval)
    chatInterval = null
  }
  
  // Stop any ongoing movement
  if (bot && bot.entity) {
    bot.setControlState('forward', false)
    bot.setControlState('back', false)
    bot.setControlState('left', false)
    bot.setControlState('right', false)
    bot.setControlState('jump', false)
    bot.setControlState('sneak', false)
  }
  
  isWalking = false
}

function handleDisconnect() {
  // Prevent multiple simultaneous reconnection attempts
  if (reconnectTimeout) {
    console.log('🔄 Reconnection already scheduled, skipping...')
    return
  }
  
  stopAntiAfkFeatures()

  if (config.reconnect.enabled && (config.reconnect.maxRetries === -1 || retryCount < config.reconnect.maxRetries)) {
    retryCount++
    console.log(`⏳ Reconnecting in ${config.reconnect.delay / 1000} seconds... (Attempt ${retryCount})`)
    
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null // Clear the timeout reference
      createBot()
    }, config.reconnect.delay)
  } else {
    console.log('❌ Max reconnection attempts reached or reconnection disabled. Exiting...')
    process.exit(1)
  }
}

// Handle graceful shutdown
function gracefulShutdown() {
  console.log('\n🛑 Shutting down bot...')
  stopAntiAfkFeatures()
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (bot) {
    bot.quit('Bot shutting down')
  }
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Start the bot
console.log('🤖 Starting Minecraft AFK Bot...')
console.log('Configuration loaded:')
console.log(`- Server: ${config.server.host}:${config.server.port}`)
console.log(`- Username: ${config.bot.username}`)
console.log(`- Auth: ${config.bot.auth}`)
console.log(`- Cracked Auth: ${config.crackedAuth.enabled ? 'Enabled' : 'Disabled'}`)
console.log(`- Anti-AFK: ${config.antiAfk.enabled ? 'Enabled' : 'Disabled'}`)
console.log(`- Auto-reconnect: ${config.reconnect.enabled ? 'Enabled' : 'Disabled'}`)
console.log('---')

createBot()
// Simple Express web server for Render + Freshping
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('🤖 AFK Bot is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🌐 Web server running on port ${port}`);
});
