'use strict';

//------------------------------------------------------------//

const path = require('node:path');
const recursiveReadDirectory = require('recursive-read-directory');
const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');
const { GuildConfigsManager } = require('../../../../common/app/guild_configs');

//------------------------------------------------------------//

/**
 * @typedef {{
 *  name: string,
 *  description: string,
 *  options: Discord.ApplicationCommandOptionData[],
 *  handler(setting: Setting, command_interaction: Discord.CommandInteraction) => Promise<unknown>,
 * }} SettingAction
 *
 * @typedef {{
 *  name: string,
 *  actions: SettingAction[],
 * }} Setting
 */

//------------------------------------------------------------//

/** @type {Setting[]} */
const settings = [];

//------------------------------------------------------------//

const path_to_settings_files = path.join(process.cwd(), 'src', 'misc', 'settings');
const settings_file_names = recursiveReadDirectory(path_to_settings_files);

for (const setting_file_name of settings_file_names) {
    const setting_file_path = path.join(path_to_settings_files, setting_file_name);

    /** @type {Setting} */
    let setting;
    try {
        setting = require(setting_file_path);
    } catch (error) {
        console.trace('unable to load setting:', setting_file_path, error);
        continue;
    }

    settings.push(setting);
}

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'settings',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: settings.map(setting => ({
            type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
            name: setting.name,
            description: 'n/a',
            options: setting.actions.map(action => ({
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: action.name,
                description: action.description,
                options: action.options,
            })),
        })),
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_ADMIN,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('GUILD_ADMIN'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const setting_name = interaction.options.getSubcommandGroup(true);

        const setting = settings.find(setting => setting.name === setting_name);
        if (!setting) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `The setting \`${setting_name}\` is unavailable.`,
                    }),
                ],
            }).catch(console.warn);
        }

        const setting_action_name = interaction.options.getSubcommand(true);

        const setting_action = setting.actions.find(action => action.name === setting_action_name);
        if (!setting_action) {
            return interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `The action \`${setting_action_name}\` is unavailable for setting \`${setting_name}\`.`,
                    }),
                ],
            }).catch(console.warn);
        }

        const guild_config = await GuildConfigsManager.fetch(interaction.guildId);

        await setting_action.handler(setting, guild_config, interaction);
    },
});
