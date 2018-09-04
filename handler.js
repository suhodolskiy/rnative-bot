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
      let { id, owner_id, post_type, attachments, text } = data.object
      if (text && text.indexOf('@rnative') !== -1 && post_type === 'post') {
        let isHelpPost = false
        let embed = {}

        if (text.indexOf('#help') !== -1) {
          text += `\n\n Link for answer: http://vk.com/rnative?w=wall${owner_id}_${id}`
          isHelpPost = true
        }

        if (attachments && attachments.length) {
          attachments.some((file) => {
            if (
              file.type === 'photo' &&
              file.photo &&
              (file.photo.photo_604 || file.photo.photo_807)
            ) {
              embed.image = {
                url: file.photo.photo_807 || file.photo.photo_604,
              }

              return true
            }
          })
        }

        if (!isHelpPost) {
          await Promise.all([
            sendMessageToTelegramChannel(text, embed),
            sendMessageToDiscordChannel(
              process.env.DISCORD_CHANNEL_NEWS,
              text,
              embed
            ),
          ])
        } else {
          await sendMessageToDiscordChannel(
            process.env.DISCORD_CHANNEL_HELP,
            text,
            embed
          )
        }

        await callback(null, {
          statusCode: 200,
          body: 'ok',
        })
      }

      callback(null, { success: true })
      break
  }
}

const sendMessageToDiscordChannel = (channel, content, embed) =>
  axios({
    url: `https://discordapp.com/api/channels/${channel}/messages`,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    json: true,
    data: { content, embed },
  })

const sendMessageToTelegramChannel = (text, embed) => {
  const photo = embed && embed.image && embed.image.url ? embed.image.url : null
  return axios({
    url: `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/${
      photo ? 'sendPhoto' : 'sendMessage'
    }`,
    method: 'POST',
    json: true,
    data: {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      [photo ? 'caption' : 'text']: text,
      photo,
    },
  })
}
