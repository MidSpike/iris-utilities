'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientInteraction, ClientInteractionManager, ClientCommandHelper } = require('../../../../common/app/client_interactions');
const { joinVoiceChannel } = require('@discordjs/voice');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'test',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        description: 'n/a',
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.BOT_SUPER,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('BOT_SUPER'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply();

        const voice_channel = interaction.member?.voice.channel;
        if (!voice_channel) return;

        joinVoiceChannel({
            channelId: voice_channel.id,
            guildId: voice_channel.guild.id,
            adapterCreator: voice_channel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        await interaction.followUp({
            content: `${interaction.member}, did the test!`,
        }).catch(console.warn);

        for (const client_interaction of ClientInteractionManager.interactions.values()) {
            if (client_interaction.type !== Discord.Constants.InteractionTypes.APPLICATION_COMMAND) continue;

            for (const guild of discord_client.guilds.cache.values()) {
                await guild.commands.create({
                    name: client_interaction.identifier,
                    ...client_interaction.data,
                });
            }
        }
    },
});
