//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { UserConfig } from '@root/types/index';

import * as Discord from 'discord.js';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_user_configs_collection_name = process.env.MONGO_USER_CONFIGS_COLLECTION_NAME as string;
if (!db_user_configs_collection_name?.length) throw new TypeError('MONGO_USER_CONFIGS_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

async function doesUserHaveVoiceRecognitionEnabled(
    user_id: string
): Promise<boolean> {
    const [ user_config ] = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        user_id: user_id,
    }).catch(() => undefined) as unknown as (UserConfig | undefined)[];

    return user_config?.voice_recognition_enabled ?? false; // default to false to avoid unwanted data collection
}

//------------------------------------------------------------//

export async function shouldUserVoiceBeProcessed(
    discord_client: Discord.Client<true>,
    user_id: string,
): Promise<boolean> {
    const user = discord_client.users.resolve(user_id);
    if (!user) return false;

    if (user.bot) return false;
    if (user.system) return false;

    if (user.id === discord_client.user.id) return false;

    return await doesUserHaveVoiceRecognitionEnabled(user_id);
}
