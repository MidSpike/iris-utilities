//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { doesUserHaveVoiceRecognitionEnabled } from './permissions';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_user_configs_collection_name = process.env.MONGO_USER_CONFIGS_COLLECTION_NAME as string;
if (!db_user_configs_collection_name?.length) throw new TypeError('MONGO_USER_CONFIGS_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

/**
 * This function determines whether or not a user's voice should be processed.
 * The user has to have opted-in to voice recognition, and they cannot be a bot.
 */
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
