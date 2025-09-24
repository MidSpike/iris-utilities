//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { UserConfig } from '@root/types';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const db_name = parseEnvironmentVariable(EnvironmentVariableName.MongoDatabaseName, 'string');

const db_user_configs_collection_name = parseEnvironmentVariable(EnvironmentVariableName.MongoUserConfigsCollectionName, 'string');

//------------------------------------------------------------//

async function hasUserAllowedVoiceRecognition(
    user_id: string
): Promise<boolean> {
    const db_find_cursor_user_config = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        'user_id': user_id,
    }, {
        projection: {
            '_id': false, // don't return the `_id` field
        },
    });

    const user_config = await db_find_cursor_user_config.next() as UserConfig | null;
    if (!user_config) return false; // opt-in is required, default to disabled when non-existent

    return user_config.voice_recognition_enabled ?? false; // opt-in is required, default to disabled when non-existent
}

async function setVoiceRecognitionStateForUser(
    user_id: string,
    voice_recognition_enabled: boolean,
) {
    await go_mongo_db.update(db_name, db_user_configs_collection_name, {
        'user_id': user_id,
    }, {
        $set: {
            'voice_recognition_enabled': voice_recognition_enabled,
        } as Partial<UserConfig>,
    }, {
        upsert: true,
    });
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'voice_commands',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'allows donators to configure voice command features',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.SubcommandGroup,
                name: 'listen_to_me',
                description: 'allows donators to configure voice recognition',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.Subcommand,
                        name: 'toggle',
                        description: 'allows donators to toggle voice recognition',
                        options: [],
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Donator,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.DONATOR,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply();

        switch (interaction.options.getSubcommandGroup(true)) {
            case 'listen_to_me': {
                switch (interaction.options.getSubcommand(true)) {
                    case 'toggle': {
                        const user_has_enabled_voice_recognition = await hasUserAllowedVoiceRecognition(interaction.user.id);
                        if (user_has_enabled_voice_recognition) {
                            await setVoiceRecognitionStateForUser(interaction.user.id, false);

                            await interaction.editReply({
                                embeds: [
                                    CustomEmbed.from({
                                        color: CustomEmbed.Colors.Red,
                                        description: `${interaction.user}, I'm no longer listening to you for voice commands!`,
                                    }),
                                ],
                            }).catch(() => {});

                            return;
                        }

                        await interaction.editReply({
                            embeds: [
                                CustomEmbed.from({
                                    color: CustomEmbed.Colors.Violet,
                                    description: [
                                        `${interaction.user}, you must agree to the following terms and conditions.`,
                                        '\`\`\`',
                                        'By enabling voice recognition, you agree to the following:',
                                        '',
                                        'You consent to this discord bot collecting/using your voice data.',
                                        'You consent to 3rd parties collecting/using your voice data.',
                                        '',
                                        'Voice data is only gathered while using a voice channel with this bot connected.',
                                        '',
                                        'The following identifiable information is collected/used:',
                                        '- Your microphone audio input.',
                                        '',
                                        'The 3rd parties used for providing voice recognition are:',
                                        '- Google (United States)',
                                        '',
                                        'You may disable voice recognition at any time by using this command again.',
                                        '',
                                        'If you do not agree to these terms and conditions, you must disable voice recognition.',
                                        '\`\`\`',
                                    ].join('\n'),
                                }),
                            ],
                            components: [
                                {
                                    type: Discord.ComponentType.ActionRow,
                                    components: [
                                        {
                                            type: Discord.ComponentType.Button,
                                            style: Discord.ButtonStyle.Danger,
                                            customId: 'voice_commands_listen_to_me_toggle_consent_given',
                                            label: 'I agree',
                                        }, {
                                            type: Discord.ComponentType.Button,
                                            style: Discord.ButtonStyle.Secondary,
                                            customId: 'voice_commands_listen_to_me_toggle_consent_not_given',
                                            label: 'Cancel',
                                        },
                                    ],
                                },
                            ],
                        });

                        const button_interaction = await interaction.channel.awaitMessageComponent({
                            componentType: Discord.ComponentType.Button,
                            filter: (button_interaction) => button_interaction.user.id === interaction.user.id,
                            time: 5 * 60_000, // 5 minutes
                        });

                        await button_interaction.deferUpdate();

                        if (
                            !button_interaction ||
                            button_interaction.customId === 'voice_commands_listen_to_me_toggle_consent_not_given'
                        ) {
                            await button_interaction.editReply({
                                embeds: [
                                    CustomEmbed.from({
                                        color: CustomEmbed.Colors.Red,
                                        description: `${interaction.user}, You must agree to the terms and conditions to enable voice recognition!`,
                                    }),
                                ],
                                components: [],
                            });

                            return;
                        }

                        await setVoiceRecognitionStateForUser(interaction.user.id, true);

                        await button_interaction.editReply({
                            embeds: [
                                CustomEmbed.from({
                                    color: CustomEmbed.Colors.Green,
                                    description: [
                                        `${interaction.user}, I'm now listening to you for voice commands!`,
                                        '',
                                        'You can disable voice recognition at any time by using this command again.',
                                    ].join('\n'),
                                }),
                            ],
                            components: [],
                        }).catch(() => {});

                        break;
                    }

                    default: {
                        break;
                    }
                }

                break;
            }

            default: {
                break;
            }
        }
    },
});
