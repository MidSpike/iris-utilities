//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Setting } from 'typings';

import { CustomEmbed } from '@root/common/app/message';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

//------------------------------------------------------------//

export default {
    name: 'url_blocking',
    actions: [
        {
            name: 'help',
            description: 'displays information about the url blocking feature',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${command_interaction.user}, url blocking is a feature that allows you to block all urls from being posted in the server.`,
                                '',
                                'For example, after enabling url blocking, users will no longer be able to post links such as:',
                                '\`\`\`',
                                '- https://www.google.com/',
                                '- h t t p s : / / y o u t u b e . c o m /',
                                '\`\`\`',
                                'By default, url blocking is disabled.',
                                '',
                                'Additionally, members with the \`Manage Messages\` or \`Administrator\` permission can still post links when url blocking is enabled.',
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'status',
            description: 'shows the current status for url blocking in the server',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                const url_blocking_enabled = guild_config.url_blocking_enabled ?? false;

                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${command_interaction.user}, url blocking is currently ${url_blocking_enabled ? 'enabled' : 'disabled'} in this server.`,
                                '',
                                'Notice: members with the \`Manage Messages\` or \`Administrator\` permission can always post links.',
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'enable',
            description: 'enables url blocking for this server',
            options: [],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                await GuildConfigsManager.update(interaction.guildId, {
                    url_blocking_enabled: true,
                });

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, enabled url blocking for this server.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'disable',
            description: 'disables url blocking for this server',
            options: [],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                await GuildConfigsManager.update(interaction.guildId, {
                    url_blocking_enabled: false,
                });

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, disabled url blocking for this server.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        },
    ],
} as Setting;
