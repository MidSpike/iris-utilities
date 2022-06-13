//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildConfig, GuildConfigTemplate, GuildId } from 'typings';

import * as Discord from 'discord.js';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_guild_configs_collection_name = process.env.MONGO_GUILD_CONFIGS_COLLECTION_NAME as string;
if (!db_guild_configs_collection_name?.length) throw new TypeError('MONGO_GUILD_CONFIGS_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

type GuildConfigCacheItem = {
    guild_id: GuildId;
    config: GuildConfig;
    epoch: number;
}

//------------------------------------------------------------//

export class GuildConfigsManager {
    static cache_lifespan = 30_000; // 30 seconds

    static cache = new Discord.Collection<GuildId, GuildConfigCacheItem>();

    static get guild_config_template(): GuildConfigTemplate {
        return {
            _creation_epoch: Date.now(),
            _last_modified_epoch: Date.now(),
        };
    }

    private static async _create(
        guild_id: GuildId,
    ): Promise<GuildConfig> {
        const guild_config_template = GuildConfigsManager.guild_config_template;

        const new_guild_config = {
            guild_id: guild_id,
            ...guild_config_template,
        };

        try {
            await go_mongo_db.add(db_name, db_guild_configs_collection_name, [
                new_guild_config,
            ]);
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager._create(): failed to create new guild_config for ${guild_id} in the database`);
        }

        GuildConfigsManager.cache.set(guild_id, {
            guild_id: guild_id,
            epoch: Date.now(),
            config: new_guild_config,
        });

        return new_guild_config;
    }

    static async fetch(
        guild_id: GuildId,
        bypass_cache: boolean = false,
    ): Promise<GuildConfig> {
        const guild_config_cache_item = GuildConfigsManager.cache.get(guild_id);

        let guild_config = guild_config_cache_item?.config;

        const current_epoch = Date.now();
        const cached_guild_config_has_expired = current_epoch >= (guild_config_cache_item?.epoch ?? current_epoch) + GuildConfigsManager.cache_lifespan;

        if (!guild_config || cached_guild_config_has_expired || bypass_cache) {
            const [ db_guild_config ] = await go_mongo_db.find(db_name, db_guild_configs_collection_name, {
                'guild_id': guild_id,
            }) as unknown as GuildConfig[];

            guild_config = db_guild_config ?? await GuildConfigsManager._create(guild_id);
        }

        return guild_config;
    }

    static async update(
        guild_id: GuildId,
        partial_guild_config: Partial<GuildConfig> = {},
    ): Promise<GuildConfig> {
        const current_guild_config = await GuildConfigsManager.fetch(guild_id, true);

        const guild_config_template = GuildConfigsManager.guild_config_template;

        const updated_guild_config = {
            ...guild_config_template,
            ...current_guild_config,
            ...partial_guild_config,
            _last_modified_epoch: Date.now(),
        };

        try {
            await go_mongo_db.update(db_name, db_guild_configs_collection_name, {
                'guild_id': guild_id,
            }, {
                $set: {
                    ...updated_guild_config,
                },
            }, {
                upsert: true,
            });
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager.update(): failed to update guild_config for ${guild_id} in the database`);
        }

        GuildConfigsManager.cache.set(guild_id, {
            guild_id: guild_id,
            epoch: Date.now(),
            config: updated_guild_config,
        });

        return updated_guild_config;
    }

    static async remove(
        guild_id: GuildId,
    ): Promise<void> {
        try {
            await go_mongo_db.remove(db_name, db_guild_configs_collection_name, {
                'guild_id': guild_id,
            });
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager.remove(): failed to remove guild_config for ${guild_id} from the database`);
        }

        GuildConfigsManager.cache.delete(guild_id);
    }
}
