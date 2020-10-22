'use strict';

//#region local dependencies
const { Timer, array_random } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { botHasPermissionsInGuild, isThisBotsOwner } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'YEET',
    category:`${DisBotCommander.categories.GUILD_ADMIN}`,
    description:'Yeet people from your voice channel into other voice channels',
    aliases:['yeet'],
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

        const members_to_yeet = command_args[0] === 'bots' ? (
            message.member.voice.channel.members.filter(m => m.user.bot && m.id !== client.user.id)
        ) : (
            command_args[0] === 'members' ? (
                message.member.voice.channel.members.filter(m => !m.user.bot && m.id !== message.member.id)
            ) : (
                command_args[0] === 'all' ? (
                    message.member.voice.channel.members.filter(m => m.id !== message.member.id)
                ) : (
                    message.mentions.members
                )
            )
        );

        if (members_to_yeet.size === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Woah there!',
                description: `I couldn't find anyone to yeet from your voice channel!`,
                fields: [
                    {
                        name: 'Command Description',
                        value: 'This command can be used to "yeet" (move) users from your voice channel into the afk channel, falling back to a random voice channel!',
                    }, {
                        name: 'Example Usages',
                        value: [
                            `Yeeting mentioned members:${'```'}\n${discord_command} @user1 @user2 @user3\n${'```'}`,
                            `Yeeting all bots:${'```'}\n${discord_command} bots\n${'```'}`,
                            `Yeeting all members:${'```'}\n${discord_command} members\n${'```'}`,
                            `Yeeting all bots and members from the voice channel:${'```'}\n${discord_command} all\n${'```'}`,
                        ].join(''),
                    },
                ],
            }, message));
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title:`Yeeted ${members_to_yeet.size} member(s) from your voice channel!`
        }, message));

        for (const member_to_yeet of members_to_yeet.values()) {
            if (isThisBotsOwner(member_to_yeet.id)) continue;
            const available_vcs = message.guild.channels.cache.filter(c => c.type === 'voice' && c.id !== message.member.voice.channel.id && c.permissionsFor(message.guild.me).has('MOVE_MEMBERS'));
            const random_vc = array_random(Array.from(available_vcs.values()));
            const vc_to_yeet_them_to = message.guild.afkChannel ?? random_vc;
            if (!vc_to_yeet_them_to) {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Woah there!',
                    description: `There aren't any other voice channels for the user(s) to be yeeted to!`,
                }, message));
                return;
            }
            member_to_yeet.voice.setChannel(vc_to_yeet_them_to).catch(() => {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Uh Oh!',
                    description: 'I was unable to yeet a user from your voice channel!',
                }, message));
            });
            await Timer(125); // Add a small delay to prevent an overload of API requests
        }
    },
});
