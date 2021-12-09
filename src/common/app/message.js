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

module.exports = {
    CustomEmbed,
    disableMessageComponents,
};
