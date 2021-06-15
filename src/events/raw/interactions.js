'use strict';

//---------------------------------------------------------------------------------------------------------------//

const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { client } = require('../../libs/discord_client.js');

//---------------------------------------------------------------------------------------------------------------//

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'raw',
    async callback(event) {
        if (event.t === 'INTERACTION_CREATE') {
            const interaction = event.d;

            console.log({
                interaction,
            });

            const interaction_custom_id = interaction.data.custom_id;

            const new_ping_pong_text = interaction_custom_id === 'test_command_ping' ? 'Pong!' : 'Ping!';

            try {
                await axios({
                    method: 'post',
                    url: `https://discord.com/api/v9/interactions/${interaction.id}/${interaction.token}/callback`,
                    headers: {
                        'Authorization': `Bot ${process.env.BOT_DISCORD_API_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        'type': 7,
                        'data': {
                            'embeds': [
                                {
                                    'color': 0xFF5500,
                                    'title': new_ping_pong_text,
                                }
                            ],
                            'components': [
                                {
                                    'type': 1,
                                    'components': [
                                        {
                                            'type': 2,
                                            'style': 2,
                                            'label': new_ping_pong_text,
                                            'emoji': {
                                                'id': '678665106275565647',
                                                'name': 'bot_emoji_bot',
                                                'animated': false,
                                            },
                                            'custom_id': `${interaction_custom_id === 'test_command_ping' ? 'test_command_pong' : 'test_command_ping'}`,
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
                    },
                });

                // const message = await client.channels.resolve(interaction.channel_id).messages.fetch(interaction.message.id);
                // message.edit({
                //     embeds: [
                //         {
                //             color: 0xFF5500,
                //             title: (interaction_custom_id === 'test_command_ping' ? 'Pong!' : 'Ping'),
                //         },
                //     ],
                // });
            } catch (error) {
                console.trace(error);
            }
        }
    },
};
