'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

const { music_subscriptions } = require('../../../../common/app/music/music');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'loop',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'type',
                description: 'the type of looping method',
                choices: [
                    {
                        name: 'off',
                        value: 'off',
                    }, {
                        name: 'current track',
                        value: 'track',
                    }, {
                        name: 'all tracks',
                        value: 'queue',
                    },
                    /** @todo */
                    // {
                    //     name: 'autoplay',
                    //     value: 'autoplay',
                    // },
                ],
                required: true,
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

        const guild_member_voice_channel_id = interaction.member?.voice?.channel?.id;
        const bot_voice_channel_id = interaction.guild.me.voice.channel?.id;

        if (!bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, I\'m not connected to a voice channel!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        if (guild_member_voice_channel_id !== bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in the same voice channel as me!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});
            return;
        }

        const looping_mode_option = interaction.options.get('type');

        try {
            music_subscription.queue.looping_mode = looping_mode_option.value;
        } catch (error) {
            console.trace(error, { looping_mode_option });

            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, an error occurred while trying to set the looping mode!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const command_looping_mode_option = this.data.options.find(option => option.name === looping_mode_option.name);

        /** @type {import('discord.js').ApplicationCommandOptionChoice[]} */
        const command_looping_mode_choices = command_looping_mode_option.choices;

        /** @type {import('discord.js').ApplicationCommandOptionChoice} */
        const command_looping_mode_choice = command_looping_mode_choices.find(choice => choice.value === looping_mode_option.value);

        await interaction.editReply({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, set queue looping to **${command_looping_mode_choice.name}**.`,
                }),
            ],
        }).catch(() => {});
    },
});
