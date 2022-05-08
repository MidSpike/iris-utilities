'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');

const { delay } = require('../../../../common/lib/utilities');

const {
    joinVoiceChannel,
} = require('@discordjs/voice');

const { ClientInteraction, ClientInteractionManager, ClientCommandHelper } = require('../../../../common/app/client_interactions');

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

        await interaction.reply({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, running test...`,
                }),
            ],
        }).catch(() => {});

        const voice_channel = interaction.member?.voice?.channel;
        if (voice_channel) {
            joinVoiceChannel({
                channelId: voice_channel.id,
                guildId: voice_channel.guild.id,
                adapterCreator: voice_channel.guild.voiceAdapterCreator,
                selfDeaf: false,
            });
        }

        // await interaction.followUp({
        //     content: `${interaction.member}, did the test!`,
        //     components: [
        //         {
        //             type: 1,
        //             components: [
        //                 {
        //                     type: 2,
        //                     style: 1,
        //                     custom_id: 'test_button',
        //                     label: 'Test Button',
        //                 },
        //             ],
        //         },
        //     ],
        // }).catch(console.warn);

        for (const guild of discord_client.guilds.cache.values()) {
            /* remove non-existent commands */
            for (const [ guild_command_id, guild_command ] of await guild.commands.fetch()) {
                const command_exists = ClientInteractionManager.interactions.find(interaction => interaction.identifier === guild_command.name);

                if (!command_exists) {
                    console.info(`Guild: ${guild.id}; removing command: ${guild_command.name};`);
                    await guild.commands.delete(guild_command_id);
                }

                await delay(100); // prevent api abuse
            }

            const commands_to_register = [];
            for (const client_interaction of ClientInteractionManager.interactions.values()) {
                if (client_interaction.type !== Discord.Constants.InteractionTypes.APPLICATION_COMMAND) continue;

                commands_to_register.push({
                    name: client_interaction.identifier,
                    ...client_interaction.data,
                });
            }

            try {
                console.info(`Guild: ${guild.id}; registering commands`);
                await guild.commands.set(commands_to_register);
            } catch (error) {
                console.trace(error);
            }
        }

        await interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, test complete!`,
                }),
            ],
        }).catch(() => {});
    },
});
