'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_NEW_MEMBER_ROLES',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    description:'sets new member roles',
    aliases:['set_new_member_roles'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args, guild_config_manipulator } = opts;
        const role_mentions = message.mentions.roles;
        if (role_mentions.size > 0) {
            message.channel.send(new CustomRichEmbed({
                title:`Setting Automatic Roles For New Members`,
                description:`New Automatic Roles: ${'```'}\n${role_mentions.map(role => role.name).join('\n')}\n${'```'}`
            }, message));
            guild_config_manipulator.modifyConfig({
                new_member_roles:role_mentions.map(role => role.id)
            });
        } else if (command_args[0] === 'reset') {
            message.channel.send(new CustomRichEmbed({
                title:`Success: removed all automatic roles for new users!`
            }, message));
            guild_config_manipulator.modifyConfig({
                new_member_roles:[]
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                description:'Please provide roles to be given to new members after the command next time!',
                fields:[
                    {name:'Example', value:`${'```'}\n${discord_command} @role1 @role2 @role3\n${'```'}`},
                    {name:'Resetting back to default', value:`You can always run \`${discord_command} reset\` to reset this setting!`},
                    {name:'Information', value:`When setting auto roles, make sure that I have \`ADMINISTRATOR\` permissions and that my role is placed above the roles you want me to add to the user.`}
                ]
            }));
        }
    },
});
