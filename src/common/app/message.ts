//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

type CustomEmojiIdentifierName = string;
type CustomEmojiIdentifier = string;

export class CustomEmoji {
    static identifiers: {
        [key: CustomEmojiIdentifierName]: CustomEmojiIdentifier;
    } = {
        SPEAKER: '<:bot_emoji_speaker:971821916392423494>',
        MUTE: '<:bot_emoji_mute:971821789594411078>',
        VOLUME_DOWN: '<:bot_emoji_volume_down:971821711509041242>',
        VOLUME_UP: '<:bot_emoji_volume_up:971821558735724614>',
        BOT: '<:bot_emoji_bot:878350454021554215>',
        MIDSPIKE: '<:bot_emoji_midspike:878349649675690024>',
        ZERO: '<:bot_emoji_zero:678691063178985480>',
        ONE: '<:bot_emoji_one:678691126357655572>',
        TWO: '<:bot_emoji_two:678691155738624011>',
        THREE: '<:bot_emoji_three:678691184603824128>',
        FOUR: '<:bot_emoji_four:678691214102364181>',
        FIVE: '<:bot_emoji_five:678691239348011018>',
        SIX: '<:bot_emoji_six:678691272986329102>',
        SEVEN: '<:bot_emoji_seven:678691301276778526>',
        EIGHT: '<:bot_emoji_eight:678691330783969290>',
        NINE: '<:bot_emoji_nine:678691358415781915>',
    };

    static convertToObject(
        custom_emoji_identifier: CustomEmojiIdentifier,
    ): {
        id?: string;
        name?: string;
    } {
        const [
            emoji_name,
            emoji_id,
        ] = custom_emoji_identifier.replace(/[\<\>]/gi, '').split(':').slice(1);

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
    Orange = 0xFF5500,
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

export function disableMessageComponents(message: Discord.Message): Promise<Discord.Message> {
    return message.fetch(true).then((message) => message.edit({
        embeds: message.embeds,
        components: message.components.map((component_row) => ({
            ...component_row.toJSON(),
            components: component_row.components.map((component) =>
                component.type === Discord.ComponentType.Button ? (
                    Discord.ButtonBuilder.from(component).setDisabled(true)
                ) : (
                    component.type === Discord.ComponentType.MentionableSelect ||
                    component.type === Discord.ComponentType.ChannelSelect ||
                    component.type === Discord.ComponentType.RoleSelect ||
                    component.type === Discord.ComponentType.UserSelect ||
                    component.type === Discord.ComponentType.StringSelect
                ) ? (
                    Discord.SelectMenuBuilder.from(component).setDisabled(true)
                ) : component
            ),
        })),
    }));
}

export function enableMessageComponents(message: Discord.Message): Promise<Discord.Message> {
    return message.fetch(true).then((message) => message.edit({
        embeds: message.embeds,
        components: message.components.map((component_row) => ({
            ...component_row.toJSON(),
            components: component_row.components.map((component) =>
                component.type === Discord.ComponentType.Button ? (
                    Discord.ButtonBuilder.from(component).setDisabled(false)
                ) : (
                    component.type === Discord.ComponentType.MentionableSelect ||
                    component.type === Discord.ComponentType.ChannelSelect ||
                    component.type === Discord.ComponentType.RoleSelect ||
                    component.type === Discord.ComponentType.UserSelect ||
                    component.type === Discord.ComponentType.StringSelect
                ) ? (
                    Discord.SelectMenuBuilder.from(component).setDisabled(false)
                ) : component
            ),
        })),
    }));
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
    } catch {
        return false;
    }

    const collected_consent_interaction = await channel.awaitMessageComponent({
        filter: (component_interaction) => component_interaction.user.id === user.id,
    });

    if (!collected_consent_interaction) return false;

    try {
        channel.messages.delete(collected_consent_interaction.message.id);
    } catch {}

    return collected_consent_interaction.customId === 'user_consents_to_potential_nsfw_content';
}
