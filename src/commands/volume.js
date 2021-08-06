'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueryType } = require('discord-player');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

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
    context: 'GUILD_CHANNELS',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.defer();

        const volume_level = command_interaction.options.get('level').value;

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                content: 'Nothing is playing right now!',
            });
        }

        queue.setVolume(AudioManager.scaleVolume(volume_level));

        const bot_message = await command_interaction.followUp({
            fetchReply: true,
            content: `Set volume to **${volume_level}**!`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'mute',
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

        const interaction_collector = await bot_message.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === command_interaction.user.id,
        });

        interaction_collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();

            console.log({
                interaction,
            });

            function roundToNearestMultipleOf(input, multiple) {
                return Math.round(input / multiple) * multiple;
            }

            switch (interaction.customId) {
                case 'mute': {
                    if (queue.volume === 0) {
                        queue.unmute();
                    } else {
                        queue.mute();
                    }
                    await interaction.editReply({
                        content: queue.volume === 0 ? 'Muted!' : 'Unmuted!',
                    });
                    break;
                }
                case 'volume_down': {
                    const new_volume_level = roundToNearestMultipleOf(AudioManager.normalizeVolume(queue.volume) - 10, 10);
                    queue.setVolume(AudioManager.scaleVolume(new_volume_level));
                    await interaction.editReply({
                        content: `Set volume to **${AudioManager.normalizeVolume(queue.volume)}**!`,
                    });
                    break;
                }
                case 'volume_up': {
                    const new_volume_level = roundToNearestMultipleOf(AudioManager.normalizeVolume(queue.volume) + 10, 10);
                    queue.setVolume(AudioManager.scaleVolume(new_volume_level));
                    await interaction.editReply({
                        content: `Set volume to **${AudioManager.normalizeVolume(queue.volume)}**!`,
                    });
                    break;
                }
                default: {
                    break;
                }
            }
        });

        interaction_collector.on('end', async () => {
            bot_message.delete();
        });
    },
});
