//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { UserSettings } from '@root/types/index';

import * as Discord from 'discord.js';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_user_configs_collection_name = process.env.MONGO_USER_CONFIGS_COLLECTION_NAME as string;
if (!db_user_configs_collection_name?.length) throw new TypeError('MONGO_USER_CONFIGS_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

async function hasUserAllowedVoiceRecognition(
    user_id: string
): Promise<boolean> {
    const [ user_config ] = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        user_id: user_id,
    }).catch(() => undefined) as unknown as (UserSettings | undefined)[];

    return user_config?.voice_recognition_enabled ?? false; // default to false to avoid unwanted data collection
}

async function setVoiceRecognitionStateForUser(
    user_id: string,
    voice_recognition_enabled: boolean,
) {
    await go_mongo_db.update(db_name, db_user_configs_collection_name, {
        user_id: user_id,
    }, {
        $set: {
            voice_recognition_enabled: voice_recognition_enabled,
        } as UserSettings,
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
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.SubcommandGroup,
                name: 'listen_to_me',
                description: 'n/a',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.Subcommand,
                        name: 'toggle',
                        description: 'n/a',
                        options: [],
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.DONATOR,
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

        await interaction.deferReply({ ephemeral: false });

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
                                        color: CustomEmbed.colors.RED,
                                        description: `${interaction.user}, I'm no longer listening to you for voice commands!`,
                                    }),
                                ],
                            }).catch(() => {});
                        } else {
                            await setVoiceRecognitionStateForUser(interaction.user.id, true);

                            await interaction.editReply({
                                embeds: [
                                    CustomEmbed.from({
                                        color: CustomEmbed.colors.GREEN,
                                        description: `${interaction.user}, I'm now listening to you for voice commands!`,
                                    }),
                                ],
                            }).catch(() => {});
                        }

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
