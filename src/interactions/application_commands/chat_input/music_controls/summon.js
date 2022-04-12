'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { joinVoiceChannel } = require('@discordjs/voice');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'summon',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [],
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

        const voice_channel = interaction.member?.voice.channel;
        if (!voice_channel) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you must be in a voice channel to use this command!`,
                    }),
                ],
            });
            return;
        }

        joinVoiceChannel({
            channelId: voice_channel.id,
            guildId: voice_channel.guild.id,
            adapterCreator: voice_channel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        await interaction.editReply({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, summoned me to <#${voice_channel.id}>!`,
                }),
            ],
        });
    },
});
