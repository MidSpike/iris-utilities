'use strict';

//------------------------------------------------------------//

const { parseCommandFromMessageContent } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = {
    name: 'messageCreate',
    async handler(message) {
        if (!message.id) return;
        if (!message.content) return;
        if (message.deleted) return;
        if (message.author.bot || message.author.system) return;

        const guild_command_prefix = '~';

        const parsed_command = parseCommandFromMessageContent(message.content, guild_command_prefix);

        if (parsed_command) {
            console.log({
                parsed_command,
            });

            parsed_command.command.handler(message, {
                command_prefix: parsed_command.command_prefix,
                command_args: parsed_command.command_args,
                command: parsed_command.command,
            });
        }
    },
};
