'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed, disableMessageComponents } = require('../../../../common/app/message');
const { AudioManager, VolumeManager } = require('../../../../common/app/audio');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'volume',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'allows you to view / control the volume',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.INTEGER,
                name: 'level',
                description: 'the volume level',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        /** @type {number?} */
        const volume_input = interaction.options.getInteger('level');

        const queue = await AudioManager.createQueue(discord_client, interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user} you can\'t change the volume as nothing is playing right now!`,
                    }),
                ],
            });
        }

        if (volume_input) {
            const minimum_allowed_volume = 0;
            const maximum_allowed_volume = 100;
            const volume_level = Math.max(minimum_allowed_volume, Math.min(volume_input, maximum_allowed_volume));
            queue.setVolume(VolumeManager.scaleVolume(VolumeManager.lockToNearestMultipleOf(volume_level, 5)));
        }

        /** @type {Discord.Message} */
        const bot_message = await interaction.followUp({
            fetchReply: true,
            embeds: [
                new CustomEmbed({
                    ...(volume_input ? {
                        description: `${interaction.user} set the volume to **${volume_input}**!`,
                    } : {
                        description: `${interaction.user} the current volume is **${VolumeManager.lockToNearestMultipleOf(VolumeManager.normalizeVolume(queue.volume), 5)}**!`,
                    }),
                }),
            ],
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
            time: 5 * 60_000,
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
                        embeds: [
                            new CustomEmbed({
                                description: `${button_interaction.user}, ${queue.volume === 0 ? 'muted' : 'unmuted'}!`,
                            }),
                        ],
                    });

                    break;
                }
                case 'volume_down': {
                    const new_volume_level = VolumeManager.lockToNearestMultipleOf(VolumeManager.normalizeVolume(queue.volume), 5) - 10;
                    queue.setVolume(VolumeManager.scaleVolume(new_volume_level));

                    await button_interaction.editReply({
                        embeds: [
                            new CustomEmbed({
                                description: `${button_interaction.user}, decreased the volume to **${VolumeManager.normalizeVolume(queue.volume)}**!`,
                            }),
                        ],
                    });

                    break;
                }
                case 'volume_up': {
                    const new_volume_level = VolumeManager.lockToNearestMultipleOf(VolumeManager.normalizeVolume(queue.volume), 5) + 10;
                    queue.setVolume(VolumeManager.scaleVolume(new_volume_level));

                    await button_interaction.editReply({
                        embeds: [
                            new CustomEmbed({
                                description: `${button_interaction.user}, increased the volume to **${VolumeManager.normalizeVolume(queue.volume)}**!`,
                            }),
                        ],
                    });

                    break;
                }
                default: {
                    break;
                }
            }
        });

        button_interaction_collector.on('end', async () => {
            await disableMessageComponents(bot_message);
        });
    },
});
