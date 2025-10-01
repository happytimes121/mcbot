import express from 'express';
import './index.js';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send("🤖 The bot is live!!!!!!!!!🐢");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
