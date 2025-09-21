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
    retryCount = 0
    isAuthenticated = false
  })

  bot.on('spawn', () => {
    console.log('✓ Bot spawned in the world')
    console.log(`Position: ${bot.entity.position}`)
    
    if (config.antiAfk.enabled) {
      startAntiAfkFeatures()
    }
  })

  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    console.log(`[CHAT] ${username}: ${message}`)
    
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

// =====================
// Authentication (cracked servers)
// =====================
function handleAuthentication(message) {
  if (!config.crackedAuth.enabled) return
  
  const password = process.env[config.crackedAuth.passwordEnvVar]
  if (!password) {
    console.log('⚠️ No cracked password found in env var:', config.crackedAuth.passwordEnvVar)
    return
  }

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

// =====================
// Walking Patterns
// =====================
let walkingPattern = 'circle'
let walkingStep = 0
let isWalking = false

function performWalkingPattern() {
  if (isWalking) return
  isWalking = true
  walkingStep++
  
  if (walkingStep % 20 === 0) {
    const patterns = ['circle', 'square', 'back_forth', 'random_walk']
    walkingPattern = patterns[Math.floor(Math.random() * patterns.length)]
    walkingStep = 1
  }
  
  switch(walkingPattern) {
    case 'circle': performCircleWalk(); break
    case 'square': performSquareWalk(); break
    case 'back_forth': performBackForthWalk(); break
    case 'random_walk': performRandomWalk(); break
  }

  // Add natural human-like actions while walking
  addPlayerLikeActions(bot)
}

function performCircleWalk() {
  const angle = (walkingStep * 18) * (Math.PI / 180)
  bot.look(angle, 0)
  bot.setControlState('forward', true)
  setTimeout(() => { bot.setControlState('forward', false); isWalking = false }, 1500)
}

function performSquareWalk() {
  const direction = Math.floor((walkingStep - 1) / 5) % 4
  const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2]
  bot.look(angles[direction], 0)
  bot.setControlState('forward', true)
  setTimeout(() => { bot.setControlState('forward', false); isWalking = false }, 1000)
}

function performBackForthWalk() {
  const forward = (walkingStep % 10) < 5
  bot.look(forward ? 0 : Math.PI, 0)
  bot.setControlState('forward', true)
  setTimeout(() => { bot.setControlState('forward', false); isWalking = false }, 1200)
}

function performRandomWalk() {
  const randomYaw = Math.random() * 2 * Math.PI
  const randomPitch = (Math.random() - 0.5) * 0.3
  bot.look(randomYaw, randomPitch)
  
  const moves = [
    () => bot.setControlState('forward', true),
    () => bot.setControlState('back', true),
    () => bot.setControlState('left', true),
    () => bot.setControlState('right', true),
    () => { bot.setControlState('jump', true); bot.setControlState('forward', true) }
  ]
  const move = moves[Math.floor(Math.random() * moves.length)]
  move()
  
  setTimeout(() => {
    bot.clearControlStates()
    isWalking = false
  }, 800)
}

// =====================
// Extra Player-Like Actions
// =====================
function addPlayerLikeActions(bot) {
  // Randomly sneak
  if (Math.random() < 0.2) {
    bot.setControlState('sneak', true)
    setTimeout(() => bot.setControlState('sneak', false), 2000 + Math.random() * 3000)
  }

  // Randomly sprint
  if (Math.random() < 0.3) {
    bot.setControlState('sprint', true)
    setTimeout(() => bot.setControlState('sprint', false), 3000 + Math.random() * 4000)
  }

  // Randomly jump
  if (Math.random() < 0.4) {
    bot.setControlState('jump', true)
    setTimeout(() => bot.setControlState('jump', false), 500)
  }

  // Randomly look around
  if (Math.random() < 0.5) {
    const yaw = bot.entity.yaw + (Math.random() - 0.5) * Math.PI
    const pitch = (Math.random() - 0.5) * 0.3
    bot.look(yaw, pitch, true)
  }
}

// =====================
// Anti-AFK Features
// =====================
function startAntiAfkFeatures() {
  console.log('🔄 Starting anti-AFK features...')
  
  if (config.antiAfk.movementInterval > 0) {
    movementInterval = setInterval(() => {
      if (bot && bot.entity) {
        performWalkingPattern()
        console.log(`🚶 Walking pattern: ${walkingPattern} (step ${walkingStep})`)
      }
    }, config.antiAfk.movementInterval)
  }

  if (config.antiAfk.chatInterval > 0 && config.antiAfk.messages.length > 0) {
    chatInterval = setInterval(() => {
      if (bot && bot.entity) {
        const msg = config.antiAfk.messages[Math.floor(Math.random() * config.antiAfk.messages.length)]
        bot.chat(msg)
        console.log('💬 Sent anti-AFK message:', msg)
      }
    }, config.antiAfk.chatInterval)
  }
}

function stopAntiAfkFeatures() {
  if (movementInterval) clearInterval(movementInterval)
  if (chatInterval) clearInterval(chatInterval)
  movementInterval = null
  chatInterval = null
  if (bot && bot.entity) bot.clearControlStates()
  isWalking = false
}

// =====================
// Disconnect / Reconnect
// =====================
function handleDisconnect() {
  if (reconnectTimeout) return
  stopAntiAfkFeatures()

  if (config.reconnect.enabled && (config.reconnect.maxRetries === -1 || retryCount < config.reconnect.maxRetries)) {
    retryCount++
    console.log(`⏳ Reconnecting in ${config.reconnect.delay / 1000}s... (Attempt ${retryCount})`)
    reconnectTimeout = setTimeout(() => { reconnectTimeout = null; createBot() }, config.reconnect.delay)
  } else {
    console.log('❌ Max reconnection attempts reached. Exiting...')
    process.exit(1)
  }
}

// Graceful shutdown
function gracefulShutdown() {
  console.log('\n🛑 Shutting down bot...')
  stopAntiAfkFeatures()
  if (reconnectTimeout) clearTimeout(reconnectTimeout)
  if (bot) bot.quit('Bot shutting down')
  process.exit(0)
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Start the bot
console.log('🤖 Starting Minecraft AFK Bot...')
createBot()

// Web server (Render/UptimeRobot ping)
const express = require('express')
const app = express()
app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'))
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`🌐 Web server running on port ${port}`))
