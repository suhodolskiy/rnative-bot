const request = require('request-promise');
const bodyParser = require('body-parser');
const express = require('express');

const config = require('./config');
const app = express();

app.use(bodyParser.json());
app.use((req, res, next) => {
  if (req.body.secret === config.vk.secret) {
    next();
  }
});

app.use((req, res) => {
  console.log('Request', req.body.type);

  switch (req.body.type) {
    case 'confirmation':
      if (req.body.group_id === config.vk.groupID) {
        res.send(config.vk.confirmCode);
      }
      break;
    case 'wall_post_new':
      const { text } = req.body.object;

      if (text && text.indexOf('#help@rnative') === -1) {
        Promise.all([
          sendMessageToDiscordChannel(text),
          sendMessageToTelegramChannel(text)
        ])
          .then(() => res.send('ok'))
          .catch(error => console.error(error));
      }
  }
});

function sendMessageToDiscordChannel(content) {
  return request({
    uri: `${config.discord.uri}/channels/${config.discord.channel}/messages`,
    headers: {
      Authorization: `Bot ${config.discord.token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    json: true,
    body: { content }
  });
}

function sendMessageToTelegramChannel(text) {
  return request({
    uri: `https://api.telegram.org/bot${config.telegram.token}/sendMessage`,
    qs: {
      chat_id: config.telegram.chatID,
      text
    }
  });
}

app.listen(config.SERVER_PORT, () => {
  console.log(`Server is listening on ${config.SERVER_PORT}`);
});
