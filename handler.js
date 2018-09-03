import axios from 'axios'

const vkGroupId = parseInt(process.env.VK_GROUP_ID)
module.exports.vk = async (event, context, callback) => {
  const data = JSON.parse(event.body)

  switch (data.type) {
    case 'confirmation':
      if (data.group_id === vkGroupId) {
        callback(null, process.env.VK_CONFIRM_CODE)
      } else {
        callback(null, { success: false, message: 'Group id do not match' })
      }
      break
    case 'wall_post_new':
      let { id, owner_id, post_type, attachments, text } = data

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

        await sendMessageToDiscordChannel(
          isHelpPost
            ? process.env.DISCORD_CHANNEL_HELP
            : process.env.DISCORD_CHANNEL_NEWS,
          text,
          embed
        )
      }

      callback(null, { success: true })
      break
  }
}

const sendMessageToDiscordChannel = (channel, content, embed) =>
  axios({
    url: `https://discordapp.com/api/channels/${channel}/messages`,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_CONTENT}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    json: true,
    data: { content, embed },
  })
