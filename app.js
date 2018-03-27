const bodyParser = require('body-parser');
const connect = require('connect');
const axios = require('axios');
const http = require('http');

const config = require('./config');
const app = connect();

app.use(bodyParser.json());

app.use((req, res, next) => {
  if (req.body.secret === config.vk.secret) {
    next();
  }
});

app.use((req, res) => {
  switch (req.body.type) {
    case 'confirmation':
      if (req.body.group_id === config.vk.groupID) {
        res.end(config.vk.confirmCode);
      }
      break;
    case 'wall_post_new':
      let { id, owner_id, post_type, text } = req.body.object;

      if (text && text.indexOf('@' + config.vk.name) !== -1 && post_type === 'post') {
        let isHelpPost = false;

        if (text.indexOf('#help') !== -1) {
          text += `\n\n Link for answer: ${config.vk.link}?w=wall${owner_id}_${id}`;
          isHelpPost = true;
        }

        sendMessageToDiscordChannel(
          isHelpPost
            ? config.discord.channels.help
            : config.discord.channels.news,
          text
        ).then(() => res.end('ok'));
      } else {
        res.end('ok');
      }
      break;
  }
});

http.createServer(app).listen(config.server.port, err => {
  if (err) {
    return console.log('Something bad happened', err);
  }

  console.log(`Server is listening on ${config.server.port}`);
});

function sendMessageToDiscordChannel(channel, content) {
  return axios({
    url: `${config.discord.uri}/channels/${channel}/messages`,
    headers: {
      Authorization: `Bot ${config.discord.token}`,
      'Content-Type': 'application/json'
    },
    method: 'POST',
    json: true,
    data: { content }
  });
}

// function sendMessageToTelegramChannel(text) {
//   return request({
//     uri: `https://api.telegram.org/bot${config.telegram.token}/sendMessage`,
//     qs: {
//       chat_id: config.telegram.chatID,
//       text
//     }
//   });
// }
