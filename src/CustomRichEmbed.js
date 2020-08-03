'use strict';

const { Discord, client } = require('../bot.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an auto-filled Discord.MessageEmbed for common usage scenarios that this bot may need
 * @param {Object} options 
 * @param {Message} message 
 * @returns {Discord.MessageEmbed} A discord message embed
 */
class CustomRichEmbed {
    constructor(options={}, message=undefined) {
        this.color = options.color ?? 0xFF5500;
        this.author = message ? (options.author !== undefined ? options.author : {iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag}`}) : (options.author ?? null);
        this.title = options.title ?? null;
        this.description = options.description ?? null;
        this.fields = options.fields ?? null;
        this.image = options.image ? {url:options.image} : null;
        this.thumbnail = options.thumbnail ? {url:options.thumbnail} : null;
        this.footer = message ? (options.footer !== undefined ? options.footer : {iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${message.cleanContent}`}) : (options.footer ?? null);
        return new Discord.MessageEmbed({...this});
    }
}

module.exports = {
    CustomRichEmbed,
};
