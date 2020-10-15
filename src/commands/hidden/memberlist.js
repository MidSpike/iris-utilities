'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendConfirmationEmbed } = require('../../libs/messages.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MEMBERLIST',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'allows you to download the member list for your server',
    aliases: ['memberlist'],
    access_level: DisBotCommand.access_levels.GUILD_OWNER,
    async executor(Discord, client, message, opts={}) {
        async function sendMemberListFileToChannel(channel) {
            const members = await message.guild.members.fetch();

            const mapped_members = members.map(member => ({
                id: member.user.id,
                tag: member.user.tag,
                display_name: member.displayName,
                roles: member.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                })),
            }));
    
            const temp_file_path = path.join(process.cwd(), 'temporary', `Member-List_${Date.now()}.json`);
            fs.writeFileSync(temp_file_path, JSON.stringify(mapped_members, null, 2), { flag: 'w' });
    
            const temp_file_read_stream = fs.createReadStream(temp_file_path);
            const message_attachment = new Discord.MessageAttachment(temp_file_read_stream);

            await channel.send(`${message.author} here is the member list for ${message.guild.name} (${message.guild.id})`, message_attachment).catch(console.warn);

            fs.unlinkSync(temp_file_path);
        }

        const embed = new CustomRichEmbed({
            title: 'Do you want to receive the member-list file here?',
            description: [
                'If you say yes, the file will be sent to this channel.',
                'If you say no, the file will be directly messaged to you.',
            ].join('\n'),
        });

        sendConfirmationEmbed(message.author.id, message.channel.id, true, embed, async () => {
            sendMemberListFileToChannel(message.channel);
        }, async () => {
            const dm_channel = await message.author.createDM();
            sendMemberListFileToChannel(dm_channel);
        });
    },
});
