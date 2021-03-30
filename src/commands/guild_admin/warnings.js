'use strict';

//#region dependencies
const { array_chunks } = require('../../utilities.js');

const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendOptionsMessage,
        removeUserReactionsFromMessage } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'WARNINGS',
    category: `${DisBotCommander.categories.GUILD_ADMIN}`,
    description: 'Displays all warnings',
    aliases: ['warnings', 'warns'],
    access_level: DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        const user_to_search_for = message.mentions.members.first();
        const all_users_warnings = guild_config.user_warnings;

        if (['clear'].includes(command_args[0])) {
            const user_to_remove_warnings_from = client.users.resolve(user_to_search_for);
            const new_user_warnings = user_to_remove_warnings_from ? all_users_warnings.filter(warning => warning.user_id !== user_to_remove_warnings_from.id) : [];
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                user_warnings: new_user_warnings,
            });
            message.channel.send(new CustomRichEmbed({
                title: `Removed all warnings ${user_to_remove_warnings_from ? `for @${user_to_remove_warnings_from.tag} ` : ''}in ${message.guild.name}!`,
            }, message));
            return;
        }

        const user_warnings = user_to_search_for ? all_users_warnings.filter(user_warning => user_warning.user_id === user_to_search_for.id) : all_users_warnings;
        const user_warnings_fields = user_warnings.map(user_warning => {
            return {
                name: `Warning Id: ${user_warning.id}`,
                value: [
                    `**User:** <@${user_warning.user_id}>`,
                    `**Warned By:** <@${user_warning.staff_id}>`,
                    `**Timestamp:** \`${user_warning.timestamp})\``,
                    `**Reason:**\n${'```'}\n${user_warning.reason}\`\n${'```'}`,
                ].join('\n'),
            };
        });
        const pages = array_chunks(user_warnings_fields, 5);
        let page_index = 0;
        function makeEmbed() {
            return new CustomRichEmbed({
                title: `Here are the warnings for ${user_to_search_for ? `@${user_to_search_for.user.tag}` : 'all users'}!`,
                description: [
                    `Do \`${discord_command} @user\` to view warnings for a specified user!`,
                    `Do \`${discord_command} clear\` to clear all warnings in the server!`,
                    `Do \`${discord_command} clear @user#0001\` to clear all warnings for a specified user!`,
                    `\nPage — ${page_index + 1} / ${pages.length === 0 ? 1 : pages.length}`
                ].join('\n'),
                fields: user_warnings_fields.length > 0 ? (
                    pages[page_index]
                ) : ({
                    name: 'Warnings',
                    value: 'No warnings exist yet!',
                }),
            }, message);
        }
        sendOptionsMessage(message.channel.id, makeEmbed(), [
            {
                emoji_name: 'bot_emoji_angle_left',
                callback(options_message, collected_reaction, user) {
                    removeUserReactionsFromMessage(options_message);
                    page_index--;
                    if (page_index < 0) page_index = pages.length-1;
                    options_message.edit(makeEmbed());
                },
            }, {
                emoji_name: 'bot_emoji_angle_right',
                callback(options_message, collected_reaction, user) {
                    removeUserReactionsFromMessage(options_message);
                    page_index++;
                    if (page_index > pages.length-1) page_index = 0;
                    options_message.edit(makeEmbed());
                },
            },
        ]);
    },
});
