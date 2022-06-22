//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

// https://gist.github.com/GeneralSadaf/42d91a2b6a93a7db7a39208f2d8b53ad#file-list-of-discord-voice-activities-md
const discord_activities = [
    { id: '832013003968348200', name: 'Checkers In The Park' },
    { id: '832012774040141894', name: 'Chess In The Park' },
    { id: '880218394199220334', name: 'Watch Together' },
    { id: '814288819477020702', name: 'Fishington.io' },
    { id: '879863686565621790', name: 'Letter League' },
    { id: '879863976006127627', name: 'Word Snacks' },
    { id: '878067389634314250', name: 'Doodle Crew' },
    { id: '755827207812677713', name: 'Poker Night' },
    { id: '773336526917861400', name: 'Betrayal' },
    { id: '832025144389533716', name: 'Ocho' },
    { id: '852509694341283871', name: 'SpellCast' },
    { id: '903769130790969345', name: 'Land-io' },
    { id: '945737671223947305', name: 'Putt Party' },
    { id: '832012854282158180', name: 'Putts (dev)' },
    { id: '879863881349087252', name: 'Awkword (dev)' },
    { id: '879864070101172255', name: 'Sketchy Artist (dev)' },
    { id: '891001866073296967', name: 'Decoders (dev)' },

    // { id: '832012586023256104', name: 'Chess In The Park (Dev)' },
    // { id: '880218832743055411', name: 'Watch Together (Dev)' },
    // { id: '763133495793942528', name: 'Poker Night (Dev)' },

    // { id: '755600276941176913', name: 'YouTube Together (Old)' },
];

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'activity',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                name: 'id',
                description: 'n/a',
                type: Discord.ApplicationCommandOptionType.String,
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.FUN_STUFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const member = await interaction.guild!.members.fetch(interaction.user.id);
        if (!member) return; // this should never happen

        const voice_channel = member.voice.channel;
        if (!voice_channel) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: 'You must be in a voice channel to use this command.',
                    }),
                ],
            });

            return;
        }

        const specified_activity_id = interaction.options.getString('id', false);

        if (!specified_activity_id) {
            interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        title: 'Available Activities',
                        description: discord_activities.map(({ id, name }) => `[\`${id}\`] - ${name}`).join('\n'),
                    }),
                ],
            });

            return;
        }

        const activity = discord_activities.find(activity => activity.id === specified_activity_id) ?? {
            id: specified_activity_id,
            name: 'Unknown Activity',
        };

        if (!activity) {
            interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Unknown Activity ID',
                        description: 'The activity id you specified is unknown.',
                    }),
                ],
            }).catch(console.warn);
        }

        const game_invite = await voice_channel.createInvite({
            temporary: false,
            maxAge: 0,
            maxUses: 0,
            targetType: 2,
            targetApplication: activity.id,
        });

        await interaction.followUp({
            content: `${interaction.member}, [click me](<${game_invite.url}>) to play \`${activity.name}\`!`,
        }).catch(console.warn);
    },
});
