'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

//------------------------------------------------------------//

export class CustomEmbed {
    static colors = {
        BRAND: 0xFF5500,
        RED: 0xFF0000,
        ORANGE: 0xFF5500,
        YELLOW: 0xFFFF00,
        GREEN: 0x00FF00,
        BLUE: 0x0000FF,
        INDIGO: 0x550088,
        VIOLET: 0xAA00FF,
    };

    static from(options: Discord.MessageEmbedOptions): Discord.MessageEmbed {
        options.color ??= this.colors.BRAND;

        return new Discord.MessageEmbed(options);
    }
}

//------------------------------------------------------------//

export function disableMessageComponents(message: Discord.Message): Promise<Discord.Message> {
    return message.fetch(true).then(message => message.edit({
        embeds: message.embeds,
        // @ts-ignore-next-line
        components: message.components.map(component_row => ({
            ...component_row.toJSON(),
            components: component_row.components.map(component => ({
                ...component.toJSON(),
                disabled: true,
            })),
        })),
    }));
}

export function enableMessageComponents(message: Discord.Message): Promise<Discord.Message> {
    return message.fetch(true).then(message => message.edit({
        embeds: message.embeds,
        // @ts-ignore-next-line
        components: message.components.map(component_row => ({
            ...component_row.toJSON(),
            components: component_row.components.map(component => ({
                ...component.toJSON(),
                disabled: false,
            })),
        })),
    }));
}

//------------------------------------------------------------//

export async function requestPotentialNotSafeForWorkContentConsent(channel: Discord.TextBasedChannel, user: Discord.User): Promise<boolean> {
    if (!(channel instanceof Discord.Channel)) throw new TypeError('channel must be an instance of Discord.Channel');
    if (!channel.isText()) throw new TypeError('channel must be a text-based channel');
    if (!(user instanceof Discord.User)) throw new TypeError('user must be an instance of Discord.User');

    try {
        await channel.send({
            content: `<@!${user.id}>`,
            embeds: [
                CustomEmbed.from({
                    title: 'Warning, this might contain potential NSFW content!',
                    description: 'Do you wish to proceed?',
                }),
            ],
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'user_consents_to_potential_nsfw_content',
                            label: 'Yes',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'user_does_not_consent_to_potential_nsfw_content',
                            label: 'No',
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
