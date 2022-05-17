'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed, disableMessageComponents } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

const { music_subscriptions } = require('../../../../common/app/music/music');

//------------------------------------------------------------//

function clampVolume(volume, min_volume=0, max_volume=200) {
    return Math.max(min_volume, Math.min(max_volume, volume));
}

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

        await interaction.deferReply({ ephemeral: false });

        const music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});
            return;
        }

        /** @type {number?} */
        const raw_volume_input = interaction.options.getInteger('level');
        const volume_input = typeof raw_volume_input === 'number' ? clampVolume(raw_volume_input) : null;
        if (typeof volume_input === 'number') {
            music_subscription.queue.volume_manager.volume = volume_input;
        }

        /** @type {Discord.Message} */
        const bot_message = await interaction.editReply({
            fetchReply: true,
            embeds: [
                CustomEmbed.from({
                    ...(volume_input ? {
                        description: `${interaction.user}, set the volume to **${volume_input}**!`,
                    } : {
                        description: `${interaction.user}, the current volume is **${music_subscription.queue.volume_manager.volume}**!`,
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
                            emoji: '971821789594411078',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'volume_down',
                            emoji: '971821711509041242',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'volume_up',
                            emoji: '971821558735724614',
                        },
                    ],
                },
            ],
        });

        const button_interaction_collector = await bot_message.createMessageComponentCollector({
            time: 1 * 60_000, // 1 minute
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            button_interaction_collector.resetTimer();

            switch (button_interaction.customId) {
                case 'volume_mute': {
                    music_subscription.queue.volume_manager.toggleMute();

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                ...(music_subscription.queue.volume_manager.muted ? {
                                    description: `${interaction.user}, muted the volume!`,
                                } : {
                                    description: `${interaction.user}, unmuted the volume!`,
                                }),
                            }),
                        ],
                    });

                    break;
                }

                case 'volume_down': {
                    music_subscription.queue.volume_manager.volume = clampVolume(music_subscription.queue.volume_manager.volume - 10);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${button_interaction.user}, decreased the volume to **${music_subscription.queue.volume_manager.volume}**!`,
                            }),
                        ],
                    });

                    break;
                }

                case 'volume_up': {
                    music_subscription.queue.volume_manager.volume = clampVolume(music_subscription.queue.volume_manager.volume + 10);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${button_interaction.user}, increased the volume to **${music_subscription.queue.volume_manager.volume}**!`,
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
