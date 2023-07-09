//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { doesUserHaveVoiceRecognitionEnabled } from './permissions';

import { CachedMap } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_user_configs_collection_name = process.env.MONGO_USER_CONFIGS_COLLECTION_NAME as string;
if (!db_user_configs_collection_name?.length) throw new TypeError('MONGO_USER_CONFIGS_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

type ShouldProcessUserVoiceCachedMapData = {
    expiration_epoch: number;
    data: boolean;
};

const should_process_user_voice_cached_map = new CachedMap<Discord.Snowflake, ShouldProcessUserVoiceCachedMapData>();

//------------------------------------------------------------//

/**
 * This function determines whether or not a user's voice should be processed.
 * The user has to have opted-in to voice recognition, and they cannot be a bot.
 */
export async function shouldUserVoiceBeProcessed(
    discord_client: Discord.Client<true>,
    user_id: string,
): Promise<boolean> {
    const cached_data = await should_process_user_voice_cached_map.ensure(
        user_id,
        async () => {
            const should_process_user_voice: boolean = await discord_client.users.fetch(user_id).then(
                async (user) => {
                    if (!user) return false;

                    if (user.bot) return false; // don't allow bots to be processed
                    if (user.system) return false; // don't allow system accounts to be processed

                    if (user.id === discord_client.user.id) return false; // don't process this bot

                    return await doesUserHaveVoiceRecognitionEnabled(user_id);
                },
            ).catch(
                // all errors are treated as if the user does not have voice recognition enabled
                () => false,
            );

            return {
                expiration_epoch: Date.now() + (1 * 60_000), // 1 minute from now
                data: should_process_user_voice,
            };
        },
    );

    return cached_data.data;
}
