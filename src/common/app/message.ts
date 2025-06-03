//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

enum CustomEmojiIdentifier {
    Speaker = '<:bot_emoji_speaker:971821916392423494>',
    Mute = '<:bot_emoji_mute:971821789594411078>',
    VolumeDown = '<:bot_emoji_volume_down:971821711509041242>',
    VolumeUp = '<:bot_emoji_volume_up:971821558735724614>',
    Bot = '<:bot_emoji_bot:878350454021554215>',
    Midspike = '<:bot_emoji_midspike:878349649675690024>',
    Zero = '<:bot_emoji_zero:678691063178985480>',
    One = '<:bot_emoji_one:678691126357655572>',
    Two = '<:bot_emoji_two:678691155738624011>',
    Three = '<:bot_emoji_three:678691184603824128>',
    Four = '<:bot_emoji_four:678691214102364181>',
    Five = '<:bot_emoji_five:678691239348011018>',
    Six = '<:bot_emoji_six:678691272986329102>',
    Seven = '<:bot_emoji_seven:678691301276778526>',
    Eight = '<:bot_emoji_eight:678691330783969290>',
    Nine = '<:bot_emoji_nine:678691358415781915>',
}

export class CustomEmoji {
    static Identifiers = CustomEmojiIdentifier;

    static convertToObject(
        custom_emoji_identifier: CustomEmojiIdentifier,
    ): {
        id: string;
        name: string;
    } {
        // slice from 2 to -1 to remove the starting `<:` and ending `>` characters
        const stripped_custom_emoji_identifier = custom_emoji_identifier.slice(2, -1);

        // split by `:` to get the emoji name and id
        const split_custom_emoji_identifier = stripped_custom_emoji_identifier.split(':') as [ string, string ];

        // destructure the split array into the emoji name and id
        const [ emoji_name, emoji_id ] = split_custom_emoji_identifier;

        return {
            id: emoji_id,
            name: emoji_name,
        };
    }
}

//------------------------------------------------------------//

enum CustomEmbedColors {
    Brand = 0xFF5500,
    Dark = 0x222222, // avoid absolute black to be compatible with discord's limitations
    Neutral = 0x555555,
    Light = 0xEEEEEE, // avoid absolute white to be compatible with discord's limitations
    Red = 0xFF0000,
    Orange = 0xFF5500, // eslint-disable-line @typescript-eslint/no-duplicate-enum-values
    Yellow = 0xFFFF00,
    Green = 0x00FF00,
    Blue = 0x0000FF,
    Indigo = 0x550088,
    Violet = 0xAA00FF,
}

export class CustomEmbed {
    static Colors = CustomEmbedColors;

    static from(options: Discord.APIEmbed): Discord.EmbedBuilder {
        options.color ??= this.Colors.Brand;

        return Discord.EmbedBuilder.from(options);
    }
}

//------------------------------------------------------------//

// TODO: This part of the code base is jank as hell, it needs to be refactored

function _modifyComponentStatesInActionRow(
    top_level_component: Discord.TopLevelComponent,
    disabled: boolean,
): Discord.TopLevelComponent {
    if (top_level_component instanceof Discord.ActionRow) {
        Discord.ActionRowBuilder.from(top_level_component).setComponents(
            top_level_component.components.map(
                (action_row_component) => Discord.createComponentBuilder(action_row_component.toJSON()).setDisabled(disabled)
            )
        );
    }

    return top_level_component; // if it's not an ActionRow, return it as is
}

export async function disableMessageComponents(
    message: Discord.Message,
): Promise<Discord.Message> {
    return message.fetch(true).then(
        async (message) => {
            return message.edit({
                embeds: message.embeds,
                components: message.components.map(
                    (component_row) => _modifyComponentStatesInActionRow(component_row, true)
                ),
            });
        }
    );
}

export async function enableMessageComponents(
    message: Discord.Message,
): Promise<Discord.Message> {
    return message.fetch(true).then(
        async (message) => message.edit({
            embeds: message.embeds,
            components: message.components.map(
                (component_row) => _modifyComponentStatesInActionRow(component_row, false)
            ),
        })
    );
}

//------------------------------------------------------------//

export async function requestPotentialNotSafeForWorkContentConsent(
    channel: Discord.TextBasedChannel,
    user: Discord.User,
): Promise<boolean> {
    // if the user is in a nsfw channel, assume they have already given consent
    if ('nsfw' in channel) {
        if (channel.nsfw) return true;
    }

    try {
        if ('send' in channel) {
            await channel.send({
                content: `${user}`,
                embeds: [
                    CustomEmbed.from({
                        title: 'Heads up!',
                        description: [
                            'This command might contain content that is not safe for work.',
                            'Do you understand the risks and still want to run this command?',
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
                                customId: 'user_consents_to_potential_nsfw_content',
                                label: 'I understand the risks',
                            }, {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Secondary,
                                customId: 'user_does_not_consent_to_potential_nsfw_content',
                                label: 'Cancel',
                            },
                        ],
                    },
                ],
            });
        }
    } catch {
        return false;
    }

    const collected_consent_interaction = await channel.awaitMessageComponent({
        filter: (component_interaction) => component_interaction.user.id === user.id,
    });

    if (!collected_consent_interaction) return false;

    try {
        await channel.messages.delete(collected_consent_interaction.message.id);
    } catch {}

    return collected_consent_interaction.customId === 'user_consents_to_potential_nsfw_content';
}

//------------------------------------------------------------//

export async function requestConfirmation(
    channel: Discord.TextBasedChannel,
    user: Discord.User,
    {
        title,
        description,
        confirm_button_label,
        cancel_button_label,
    }: {
        title: string;
        description: string;
        confirm_button_label: string;
        cancel_button_label: string;
    },
): Promise<boolean> {
    try {
        if ('send' in channel) {
            await channel.send({
                content: Discord.userMention(user.id),
                embeds: [
                    CustomEmbed.from({
                        title: title,
                        description: description,
                    }),
                ],
                components: [
                    {
                        type: Discord.ComponentType.ActionRow,
                        components: [
                            {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Primary,
                                customId: 'user_confirmed',
                                label: confirm_button_label,
                            }, {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Secondary,
                                customId: 'user_cancelled',
                                label: cancel_button_label,
                            },
                        ],
                    },
                ],
            });
        }
    } catch {
        return false;
    }

    const collected_confirmation_interaction = await channel.awaitMessageComponent({
        componentType: Discord.ComponentType.Button,
        filter: (component_interaction) => component_interaction.user.id === user.id,
    });

    if (!collected_confirmation_interaction) return false;

    try {
        await channel.messages.delete(collected_confirmation_interaction.message.id);
    } catch {
        // ignore any errors that occur when deleting the message
    }

    return collected_confirmation_interaction.customId === 'user_confirmed';
}
