'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

function roundToNearestMultipleOf(input, multiple) {
    return Math.round(input / multiple) * multiple;
}

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'volume',
    description: 'n/a',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [
        {
            type: 'INTEGER',
            name: 'level',
            description: 'the volume level',
            required: false,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
        Discord.Permissions.FLAGS.CONNECT,
        Discord.Permissions.FLAGS.SPEAK,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.defer();

        /** @type {number?} */
        const volume_level = command_interaction.options.get('level')?.value;

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                content: 'You can\'t change the volume as nothing is playing right now!',
            });
        }

        if (volume_level) {
            queue.setVolume(AudioManager.scaleVolume(volume_level));
        }

        /** @type {Discord.Message} */
        const bot_message = await command_interaction.followUp({
            fetchReply: true,
            content: `${command_interaction.user} set the volume to **${AudioManager.normalizeVolume(queue.volume)}**!`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'volume_mute',
                            emoji: {
                                id: '678696291185983497',
                                name: 'bot_emoji_mute',
                            },
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'volume_down',
                            emoji: {
                                id: '678696324618780702',
                                name: 'bot_emoji_volume_down',
                            },
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'volume_up',
                            emoji: {
                                id: '678696352359776296',
                                name: 'bot_emoji_volume_up',
                            },
                        },
                    ],
                },
            ],
        });

        const button_interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (button_interaction) => true,
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            console.log({
                button_interaction,
            });

            switch (button_interaction.customId) {
                case 'volume_mute': {
                    if (queue.volume === 0) {
                        queue.unmute();
                    } else {
                        queue.mute();
                    }

                    await button_interaction.editReply({
                        content: `${button_interaction.user}, ${queue.volume === 0 ? 'muted' : 'unmuted'}!`,
                    });

                    break;
                }
                case 'volume_down': {
                    const new_volume_level = roundToNearestMultipleOf(AudioManager.normalizeVolume(queue.volume) - 10, 10);
                    queue.setVolume(AudioManager.scaleVolume(new_volume_level));

                    await button_interaction.editReply({
                        content: `${button_interaction.user}, decreased the volume to **${AudioManager.normalizeVolume(queue.volume)}**!`,
                    });

                    break;
                }
                case 'volume_up': {
                    const new_volume_level = roundToNearestMultipleOf(AudioManager.normalizeVolume(queue.volume) + 10, 10);
                    queue.setVolume(AudioManager.scaleVolume(new_volume_level));

                    await button_interaction.editReply({
                        content: `${button_interaction.user}, increased the volume to **${AudioManager.normalizeVolume(queue.volume)}**!`,
                    });

                    break;
                }
                default: {
                    break;
                }
            }
        });

        button_interaction_collector.on('end', () => {
            bot_message.delete();
        });
    },
});
