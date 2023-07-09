//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

import { GuildConfig } from '.';

//------------------------------------------------------------//

export type SettingAction<Setting> = {
    name: string;
    description: string;
    options: Discord.ApplicationCommandOptionData[];
    handler: (
        setting: Setting,
        guild_config: GuildConfig,
        command_interaction: Discord.CommandInteraction<'cached'>
    ) => Promise<unknown>;
};

export type Setting = {
    name: string;
    description: string;
    actions: SettingAction<Setting>[];
};
