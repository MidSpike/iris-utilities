import Discord from 'discord.js';

//------------------------------------------------------------//

export type ClientEventExport<EventName extends keyof Discord.ClientEvents> = {
    /** @todo */
    // enabled?: boolean;
    name: string;
    handler(
        discord_client: Discord.Client,
        ...args: Discord.ClientEvents[EventName],
    ): Promise<void>;
}

//------------------------------------------------------------//

export type GuildId = string;

export type GuildConfig = {
    [key: string]: any;
}

//------------------------------------------------------------//

export type SettingAction<Setting> = {
    name: string,
    description: string,
    options: Discord.ApplicationCommandOptionData[],
    handler: (setting: Setting, guild_config: GuildConfig, command_interaction: Discord.CommandInteraction<'cached'>) => Promise<unknown>,
}

export type Setting = {
    name: string;
    actions: SettingAction<Setting>[];
}