// index.js
const mineflayer = require('mineflayer')
const fs = require('fs')
const express = require('express')

/*
  index.js
  - Reads config.json (same format you provided earlier).
  - Connects a mineflayer bot and makes it walk straight forever.
  - Basic "unstuck" logic: jump if not moving, turn slightly if still stuck.
  - Reconnect handling on end/error.
  - Tiny Express server for keep-alive pings (UptimeRobot / Render).
*/

let config
try {
  config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
} catch (err) {
  console.error('Failed to read config.json — create one or check path.')
  console.error(err)
  process.exit(1)
}

let bot = null
let reconnectTimeout = null
let retryCount = 0

const STUCK_CHECK_INTERVAL = Math.max(2000, config.antiAfk && config.antiAfk.movementInterval ? config.antiAfk.movementInterval : 3000)
const UNSTUCK_JUMP_MS = 300
const TURN_ANGLE = 0.35 // radians (~20 degrees)
let lastPos = null
let stuckAttempts = 0
let forwardEnabled = false

function createBot() {
  console.log(`Connecting to ${config.server.host}:${config.server.port} as ${config.bot.username}...`)
  bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    auth: config.bot.auth,
    version: config.server.version
  })

  bot.once('login', () => {
    console.log('✅ Logged in:', bot.username)
    retryCount = 0
    startWalkingForever()
  })

  bot.on('spawn', () => {
    console.log('🟢 Spawned in world at', bot.entity && bot.entity.position ? bot.entity.position : 'unknown')
    // ensure forward true after spawn
    startWalkingForever()
  })

  bot.on('death', () => {
    console.log('💀 Bot died. Will respawn and resume walking.')
    // mineflayer typically respawns automatically; ensure walking resumes on spawn
  })

  bot.on('end', (reason) => {
    console.log('🔴 Disconnected:', reason)
    stopWalking()
    scheduleReconnect()
  })

  bot.on('error', (err) => {
    console.error('⚠️ Bot error:', err && err.message ? err.message : err)
  })

  // optional: log chat for debugging
  bot.on('chat', (username, message) => {
    if (username === bot.username) return
    console.log(`[chat] ${username}: ${message}`)
  })
}

function startWalkingForever() {
  if (!bot || !bot.entity) return
  if (forwardEnabled) return
  forwardEnabled = true
  stuckAttempts = 0
  // Always look in the direction we're moving. If you want a fixed heading, set yaw here.
  // bot.look(yaw, 0, true) -> but we'll let it keep current yaw.

  // Set forward state on and keep it on
  bot.setControlState('forward', true)
  bot.setControlState('sneak', false)

  // Periodic stuck check
  lastPos = clonePos(bot.entity.position)
  bot._walkInterval = setInterval(() => {
    if (!bot || !bot.entity) return
    try {
      const pos = bot.entity.position
      if (!pos) return

      // compute distance moved
      const dx = pos.x - lastPos.x
      const dy = pos.y - lastPos.y
      const dz = pos.z - lastPos.z
      const distSq = dx * dx + dy * dy + dz * dz

      // If we moved a little, reset stuck attempts
      if (distSq > 0.001) {
        stuckAttempts = 0
        lastPos = clonePos(pos)
        return
      }

      // If not moved, try to unstuck
      stuckAttempts++
      console.log(`⚠️ Bot may be stuck (attempt ${stuckAttempts}). Trying unstuck actions...`)

      // 1) Try a brief jump
      bot.setControlState('jump', true)
      setTimeout(() => bot.setControlState('jump', false), UNSTUCK_JUMP_MS)

      // 2) If multiple attempts, turn a bit to change heading
      if (stuckAttempts >= 2) {
        // turn left or right depending on attempt parity
        const sign = stuckAttempts % 2 === 0 ? 1 : -1
        const yaw = bot.entity.yaw + (TURN_ANGLE * sign)
        // clamp pitch to 0 (horizontal)
        bot.look(yaw, 0, true)
        console.log(`➡️ Turning ${sign > 0 ? 'right' : 'left'} a bit to change heading.`)
      }

      // 3) After several attempts, try to jump-forward combo (jump + forward already on)
      if (stuckAttempts >= 5) {
        bot.setControlState('forward', false)
        setTimeout(() => bot.setControlState('forward', true), 400)
      }

      // update lastPos to avoid spamming attempts too fast
      lastPos = clonePos(pos)
    } catch (e) {
      console.error('Error during stuck check:', e)
    }
  }, STUCK_CHECK_INTERVAL)
}

function stopWalking() {
  if (!bot) return
  forwardEnabled = false
  try {
    bot.setControlState('forward', false)
    bot.setControlState('jump', false)
    bot.setControlState('left', false)
    bot.setControlState('right', false)
    bot.setControlState('back', false)
    bot.setControlState('sneak', false)
  } catch (e) {}
  if (bot._walkInterval) {
    clearInterval(bot._walkInterval)
    bot._walkInterval = null
  }
}

// simple reconnect scheduler
function scheduleReconnect() {
  if (!config.reconnect || !config.reconnect.enabled) {
    console.log('Reconnect disabled in config; exiting.')
    return
  }
  if (reconnectTimeout) {
    console.log('Reconnect already scheduled.')
    return
  }
  retryCount++
  const delay = config.reconnect.delay || 5000
  console.log(`⏳ Reconnecting in ${delay / 1000}s (attempt ${retryCount})...`)
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null
    console.log('🔁 Reconnecting now...')
    createBot()
  }, delay)
}

// helper to clone position object
function clonePos(pos) {
  if (!pos) return { x: 0, y: 0, z: 0 }
  return { x: pos.x, y: pos.y, z: pos.z }
}

// graceful shutdown
function gracefulShutdown() {
  console.log('🛑 Shutting down...')
  if (reconnectTimeout) clearTimeout(reconnectTimeout)
  stopWalking()
  if (bot) {
    try { bot.quit('Shutting down') } catch (e) {}
  }
  process.exit(0)
}
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

// Start the bot
createBot()

// Express keep-alive for UptimeRobot / Render
const app = express()
app.get('/', (req, res) => res.send('AFKBot is running and walking straight!'))
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`🌐 Keep-alive server listening on port ${port}`))
