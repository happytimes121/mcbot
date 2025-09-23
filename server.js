const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");

const app = express();
const port = process.env.PORT || 3000;

// serve simple status page
app.get("/", (req, res) => {
  res.send("AFKBot server running ✅");
});

// start web server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

// optional websocket server for external control
const wss = new WebSocketServer({ port: 8080 });
wss.on("connection", ws => {
  console.log("WebSocket client connected");
  ws.send("Hello from AFKBot server!");
});

// launch the bot process
const botProcess = spawn("node", ["index.js"], { stdio: "inherit" });

botProcess.on("close", code => {
  console.log(`Bot exited with code ${code}`);
});
