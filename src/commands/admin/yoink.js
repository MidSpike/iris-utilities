'use strict';

//#region local dependencies
const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { isThisBotsOwner, botHasPermissionsInGuild } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'YOINK',
    category:`${DisBotCommander.categories.ADMINISTRATOR}`,
    description:'Yoink people from their voice channel into your voice channel',
    aliases:['yoink'],
    access_level:DisBotCommand.access_levels.GUILD_MOD,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!botHasPermissionsInGuild(message, ['MOVE_MEMBERS'])) return;

        if (!message.member.voice?.channel) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'You must be in a voice channel to use this command!',
            }, message));
            return;
        }

        const all_guild_vc_members = message.guild.channels.cache.filter(c => c.type === 'voice').flatMap(c => c.members);

        const members_to_yoink = command_args[0] === 'bots' ? (
            all_guild_vc_members.filter(m => m.user.bot && m.id !== client.user.id)
        ) : (
            command_args[0] === 'members' ? (
                all_guild_vc_members.filter(m => !m.user.bot && m.id !== message.member.id)
            ) : (
                command_args[0] === 'all' ? (
                    all_guild_vc_members.filter(m => m.voice.channel.id !== message.member.voice.channel.id)
                ) : (
                    message.mentions.members
                )
            )
        );

        // const members_to_yoink = command_args[0] === 'all' ? all_guild_vc_members.filter(m => m.voice.channel.id !== message.member.voice.channel.id) : message.mentions.members;

        if (members_to_yoink.size === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Woah there!',
                description: `I couldn't find anyone to yoink to your voice channel!`,
                fields: [
                    {
                        name: 'Command Description',
                        value: 'This command can be used to "yoink" (move) users to your voice channel!',
                    }, {
                        name: 'Example Usages',
                        value: [
                            `Yoinking mentioned members:${'```'}\n${discord_command} @user1 @user2 @user3\n${'```'}`,
                            `Yoinking all bots to your voice channel:${'```'}\n${discord_command} bots\n${'```'}`,
                            `Yoinking all members to your voice channel:${'```'}\n${discord_command} members\n${'```'}`,
                            `Yoinking all bots and members to your voice channel:${'```'}\n${discord_command} all\n${'```'}`,
                        ].join(''),
                    },
                ],
            }, message));
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title: `Yoinked ${members_to_yoink.size} member(s) to your voice channel!`,
        }, message));

        for (const member_to_yoink of members_to_yoink.values()) {
            if (isThisBotsOwner(member_to_yoink.id)) continue;
            const vc_to_yoink_them_to = message.member.voice.channel;
            member_to_yoink.voice.setChannel(vc_to_yoink_them_to).catch(() => {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Uh Oh!',
                    description: 'I was unable to yoink a user to your voice channel!',
                }, message));
            });
            await Timer(125); // Add a small delay to prevent an overload of API requests
        }
    },
});
