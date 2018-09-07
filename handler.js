const axios = require('axios')

module.exports.vk = async (event, context, callback) => {
  const data = JSON.parse(event.body)

  if (!data || !data.secret || data.secret !== process.env.VK_SECRET_CODE) {
    callback(null, {
      statusCode: 401,
      body: 'No access',
    })
    return
  }

  switch (data.type) {
    case 'confirmation':
      if (data.group_id === parseInt(process.env.VK_GROUP_ID)) {
        callback(null, {
          statusCode: 200,
          body: process.env.VK_CONFIRM_CODE,
        })
      } else {
        callback(null, { success: false, message: 'Group id do not match' })
      }
      break
    case 'wall_post_new':
      const { post_type, attachments, text } = data.object

      if (text && text.indexOf('@rnative') !== -1 && post_type === 'post') {
        const post = {
          help: text.indexOf('#help@rnative') !== -1,
          text: formatTextFromHashtags(text),
          images: attachments
            .filter(
              (file) =>
                file.type === 'photo' &&
                file.photo &&
                (file.photo.photo_604 || file.photo.photo_807)
            )
            .map((file) => file.photo.photo_807 || file.photo.photo_604),
        }

        try {
          if (!post.help) {
            await Promise.all([
              sendMessageToTelegramChannel(post),
              sendMessageToDiscordChannel(post),
            ])
          } else {
            await sendMessageToDiscordChannel(post)
          }
        } catch (error) {
          console.error(error)
        }
      }

      callback(null, {
        statusCode: 200,
        body: 'ok',
      })

      break
  }
}

const formatTextFromHashtags = (text) =>
  text
    .split(' ')
    .map((w) => {
      if (w.indexOf('#') !== -1 && w.indexOf('@rnative') !== -1)
        w = w.substr(0, w.lastIndexOf('#')).replace(/\r|\\n/g, '')
      return w
    }, [])
    .join(' ')
    .trim()

const formatTextEllipsis = (text, length) =>
  text.length > length ? text.substring(0, length - 3) + '...' : text

const sendMessageToDiscordChannel = ({ help, text: content, images }) => {
  const channel = help
    ? process.env.DISCORD_CHANNEL_HELP
    : process.env.DISCORD_CHANNEL_NEWS

  const embed =
    images && images.length
      ? {
          image: {
            url: images[0],
          },
        }
      : null

  return axios({
    url: `https://discordapp.com/api/channels/${channel}/messages`,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    json: true,
    data: {
      content,
      embed,
    },
  })
}

const sendMessageToTelegramChannel = ({ text, images }) => {
  const photo = images && images.length ? images[0] : null
  const content = photo ? formatTextEllipsis(text, 200) : text

  return axios({
    url: `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/${
      photo ? 'sendPhoto' : 'sendMessage'
    }`,
    method: 'POST',
    json: true,
    data: {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      [photo ? 'caption' : 'text']: content,
      photo,
    },
  })
}
