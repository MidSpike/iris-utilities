'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

//------------------------------------------------------------//

class CustomEmbed {
    constructor({
        color,
        author,
        title,
        description,
        thumbnail,
        fields,
        image,
        footer,
    }) {
        return new Discord.MessageEmbed({
            color: color ?? 0xFF5500,
            author: author,
            title: title,
            description: description,
            thumbnail: thumbnail,
            fields: fields,
            image: image,
            footer: footer,
        });
    }
}

//------------------------------------------------------------//

/**
 * Disables all message components on a message.
 * @param {Discord.Message} message
 * @returns {Promise<Discord.Message>}
 */
function disableMessageComponents(message) {
    if (!(message instanceof Discord.Message)) throw new TypeError('message must be an instance of Discord.Message');

    return message.fetch(true).then(message => message.edit({
        embeds: message.embeds,
        components: message.components.map(component_row => ({
            ...component_row.toJSON(),
            components: component_row.components.map(component => ({
                ...component.toJSON(),
                disabled: true,
            })),
        })),
    }));
}

//------------------------------------------------------------//

/**
 * @param {Discord.Channel} channel text-based channel
 * @param {Discord.User} user
 * @returns {Promise<Boolean>}
 */
 async function requestPotentialNotSafeForWorkContentConsent(channel, user) {
    if (!(channel instanceof Discord.Channel)) throw new TypeError('channel must be an instance of Discord.Channel');
    if (!channel.isText()) throw new TypeError('channel must be a text-based channel');
    if (!(user instanceof Discord.User)) throw new TypeError('user must be an instance of Discord.User');

    try {
        await channel.send({
            content: `<@!${user.id}>`,
            embeds: [
                new CustomEmbed({
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

//------------------------------------------------------------//

module.exports = {
    CustomEmbed,
    disableMessageComponents,
    requestPotentialNotSafeForWorkContentConsent,
};
