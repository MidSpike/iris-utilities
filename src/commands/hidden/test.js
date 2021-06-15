'use strict';

//#region dependencies
const axios = require('axios');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'TEST',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'used for testing purposes',
    aliases: ['test'],
    cooldown: 5_000,
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        // message.channel.send({
        //     embeds: [
        //         new CustomRichEmbed({
        //             title: `Hello World! I'm ${client.user.username}!`,
        //         }),
        //     ],
        // });
        try {
            await axios({
                method: 'post',
                url: `https://discord.com/api/v9/channels/${message.channel.id}/messages`,
                headers: {
                    'Authorization': `Bot ${process.env.BOT_DISCORD_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    'embed': {
                        'color': 0xFF5500,
                        'title': 'Ping!',
                    },
                    'components': [
                        {
                            'type': 1,
                            'components': [
                                {
                                    'type': 2,
                                    'style': 2,
                                    'label': 'Ping',
                                    'emoji': {
                                        'id': '678665106275565647',
                                        'name': 'bot_emoji_bot',
                                        'animated': false,
                                    },
                                    'custom_id': 'test_command_ping',
                                }, {
                                    'type': 2,
                                    'style': 5,
                                    'label': 'https://iris.cool/',
                                    'emoji': {
                                        'id': '678665106275565647',
                                        'name': 'bot_emoji_bot',
                                        'animated': false,
                                    },
                                    'url': 'https://iris.cool/',
                                },
                            ],
                        },
                    ],
                },
            });
        } catch (error) {
            console.trace(error);
        }
    },
});
