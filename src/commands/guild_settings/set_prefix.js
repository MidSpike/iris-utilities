'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SET_PREFIX',
    category:`${DisBotCommander.categories.GUILD_SETTINGS}`,
    weight:2,
    description:'sets prefix',
    aliases:['set_prefix'],
    access_level:DisBotCommand.access_levels.GUILD_ADMIN,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, command_args, discord_command } = opts;

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

        if (command_args[0]) {
            if (message.mentions.users.size > 0) {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:'Improper Command Usage!',
                    description:`My command prefix cannot be a user mention!`
                }, message));
                return;
            }
            const old_command_prefix = guild_config.command_prefix;
            const new_command_prefix = command_args[0].replace(/\s/g, '_').toLowerCase(); // Replace whitespaces with underscores
            message.channel.send(new CustomRichEmbed({
                title:'Setting New Command Prefix',
                description:`Old Server Command Prefix: ${'```'}\n${old_command_prefix}\n${'```'}\nNew Server Command Prefix: ${'```'}\n${new_command_prefix}\n${'```'}`
            }, message));
            client.$.guild_configs_manager.updateConfig(message.guild.id, {
                command_prefix:new_command_prefix
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                title:`Well I guess it's time for me to respond to something new!`,
                description:'Make sure to enter a new command_prefix after the command next time!',
                fields:[
                    {name:'Example Command Usage', value:`${'```'}\n${discord_command} $\n${'```'}`},
                    {name:'Example Description', value:`If you run the above command, I will start responding to commands using \`$\` instead of \`${command_prefix}\``},
                ]
            }));
        }
    },
});
