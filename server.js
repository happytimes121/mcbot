const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('🤖 AFK Bot is running!'));
const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`🌐 Web server running on port ${port}`));
