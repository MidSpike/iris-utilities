'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'CHANNELINFO',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Channel Information',
    aliases:['channelinfo'],
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        const channel = client.channels.resolve(command_args[0]) ?? message.channel;
        await channel.fetch().catch(console.warn);
        message.channel.send(new CustomRichEmbed({
            title:`Don't go wild with this channel information!`,
            fields:[
                {name:'Discord Id', value:`${channel.id}`},
                {name:'Name', value:`${channel.name}`},
                {name:'Type', value:`${channel.type}`},
                {name:'Position', value:`${channel.position ?? 'N/A'}`},
                {name:'Parent', value:`${channel?.parent?.name ?? 'N/A'}`},
                {name:'Members', value:`${channel.type === 'voice' ? (channel?.members?.map(m => `${m}`)?.join(' ') ?? 'N/A') : 'N/A'}`},
                {name:`Deletable`, value:`${channel?.deletable ?? 'N/A'}`},
                {name:`Editable`, value:`${channel?.editable ?? 'N/A'}`},
                {name:`Joinable`, value:`${channel?.joinable ?? 'N/A'}`},
                {name:`Speakable`, value:`${channel?.speakable ?? 'N/A'}`},
                {name:`Manageable`, value:`${channel?.manageable ?? 'N/A'}`},
                {name:'Created On', value:`${channel.createdAt}`},
            ]
        }, message));
    },
});
