'use strict';

//------------------------------------------------------------//

const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const { ClientCommand, ClientCommandManager } = require('../common/client_commands');
const { GuildConfigsManager } = require('../common/guild_configs');

//------------------------------------------------------------//

async function updateAllGuildConfigs(discord_client) {
    console.info(`<DC S#(${discord_client.shard.id})> updating all guild configs...`);

    for (const [ guild_id ] of discord_client.guilds.cache) {
        await GuildConfigsManager.update(guild_id, {});
    }

    console.success(`<DC S#(${discord_client.shard.id})> updated all guild configs.`);
}

async function registerCommands(discord_client) {
    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> registering commands...`);

    const path_to_command_files = path.join(process.cwd(), 'src', 'commands');
    const client_command_file_names = recursiveReadDirectory(path_to_command_files);

    for (const client_command_file_name of client_command_file_names) {
        const client_command_file_path = path.join(path_to_command_files, client_command_file_name);

        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> loading command...`, { client_command_file_path });

        try {
            const client_command = require(client_command_file_path);
            if (!(client_command instanceof ClientCommand)) throw new Error('client_command is not an instance of ClientCommand');

            await ClientCommandManager.loadCommand(client_command);
        } catch (error) {
            console.trace('unable to register global command:', client_command_file_path, error);
            continue;
        }
    }

    for (const [ guild_id ] of discord_client.guilds.cache) {
        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> registering all commands to guild: ${guild_id};`);
        await ClientCommandManager.registerAllCommandsToGuild(discord_client, guild_id);
    }
}

async function unregisterDeletedCommands(discord_client) {
    console.info(`<DC S#(${discord_client.shard.id})> un-registering deleted commands...`);

    for (const guild of discord_client.guilds.cache.values()) {
        console.info(`<DC S#(${discord_client.shard.id})> un-registering deleted commands from guild: ${guild.id};`);

        const guild_commands = await guild.commands.fetch();
        for (const guild_command of guild_commands.values()) {
            const client_command = ClientCommandManager.commands.get(guild_command.name);
            if (client_command) continue;

            console.info(`<DC S#(${discord_client.shard.id})> un-registering deleted command: ${guild_command.name}; from guild: ${guild.id};`);
            await guild.commands.delete(guild_command.id);
        }
    }

    console.success(`<DC S#(${discord_client.shard.id})> un-registered all deleted commands.`);
}

//------------------------------------------------------------//

module.exports = {
    name: 'ready',
    async handler(discord_client) {
        console.success(`<DC S#(${discord_client.shard.id})> client is ready.`);

        /* update all guild configs */
        updateAllGuildConfigs(discord_client);

        /* register all commands */
        registerCommands(discord_client);

        /* un-register deleted commands */
        unregisterDeletedCommands(discord_client);
    },
};
