'use strict';

function getDiscordCommand(message_content) {
    return message_content.split(/\s/g).filter(item => item !== '')[0].toLowerCase();
}

function getDiscordCommandArgs(message_content) {
    return message_content.split(/\s/g).filter(item => item !== '').slice(1);
}

function getDiscordCleanCommandArgs(message_clean_content) {
    return message_clean_content.split(/\s/g).filter(item => item !== '').slice(1);
}

class DisBotCommand {
    constructor(name='', aliases=[], executor=(client, message, opts={})=>{}) {
        if (typeof name !== 'string' || name.length === 0) throw new Error('`name` must be a valid string!');
        if (!Array.isArray(aliases) || aliases.length === 0) throw new Error('`desciption` must be a valid array!');
        if (typeof executor !== 'function') throw new Error('`executor` must be a valid executor function!');
        this.name = name;
        this.aliases = aliases;
        this.executor = executor;
        return this;
    }
    execute(client, message, opts={}) {
        return this.executor(client, message, opts);
    }
}

class DisBotCommander {
    static #commands = [];
    static get commands() {
        return this.#commands;
    }
    static registerCommand(command) {
        if (command instanceof DisBotCommand) {
            this.#commands.push(command);
        } else {
            throw new TypeError(`'command' should be an instance of the DisBotCommand type!`);
        }
    }
}

module.exports = {
    getDiscordCommand,
    getDiscordCommandArgs,
    getDiscordCleanCommandArgs,
    DisBotCommand,
    DisBotCommander
};
