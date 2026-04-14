//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use mongodb::bson::to_bson;

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::common::database::adapter::get_database_name;

use crate::common::database::adapter::get_guilds_collection_name;

use crate::common::database::adapter::CollectionHelper;

//------------------------------------------------------------//

#[derive(Default, Debug, Deserialize, Serialize)]
pub enum GuildConfigModerationMode {
    #[default]
    #[serde(rename = "0")]
    DenyDiscordOverrides,

    #[serde(rename = "1")]
    AllowDiscordOverrides,
}

impl GuildConfigModerationMode {
    pub async fn are_discord_overrides_allowed(
        &self,
    ) -> bool {
        match self {
            GuildConfigModerationMode::DenyDiscordOverrides => false,
            GuildConfigModerationMode::AllowDiscordOverrides => true,
        }
    }
}

//------------------------------------------------------------//

#[derive(Default, Debug, Deserialize, Serialize, Clone)]
pub enum GuildConfigAiChatMode {
    #[default]
    #[serde(rename = "0")]
    Disabled,

    #[serde(rename = "1")]
    AiChatChannelsRequireMention,

    #[serde(rename = "2")]
    AiChatChannelsAlwaysRespond,
}

impl GuildConfigAiChatMode {
    pub fn should_respond_in_channel(
        &self,
        guild_config: &GuildConfig,
        channel_id: String,
        was_mentioned: bool,
    ) -> bool {
        let is_ai_chat_channel = guild_config.ai_chat_channels.contains(&channel_id);

        match self {
            GuildConfigAiChatMode::Disabled => false,
            GuildConfigAiChatMode::AiChatChannelsRequireMention => {
                was_mentioned && is_ai_chat_channel
            },
            GuildConfigAiChatMode::AiChatChannelsAlwaysRespond => {
                was_mentioned || is_ai_chat_channel
            },
        }
    }
}

type GuildConfigAiChatChannels = Vec<String>;

//------------------------------------------------------------//

#[derive(Debug, Deserialize, Serialize)]
pub struct GuildConfig {
    discord_guild_id: serenity::GuildId,

    #[serde(default)]
    moderation_mode: GuildConfigModerationMode,

    #[serde(default)]
    ai_chat_mode: GuildConfigAiChatMode,

    #[serde(default)]
    ai_chat_channels: GuildConfigAiChatChannels,
}

impl GuildConfig {
    pub async fn fetch(
        discord_guild_id: serenity::GuildId,
    ) -> Result<Option<GuildConfig>, Error> {
        let discord_guild_id: String = discord_guild_id.get().to_string();

        let database_name = get_database_name();
        let collection_name = get_guilds_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let guild_config = collection_helper.get(
            mongodb::bson::doc! {
                "discord_guild_id": discord_guild_id,
            }
        ).await?;

        Ok(guild_config)
    }

    pub async fn create(
        discord_guild_id: serenity::GuildId,
    ) -> Result<GuildConfig, Error> {
        let database_name = get_database_name();
        let collection_name = get_guilds_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let guild_config = collection_helper.set(
            GuildConfig {
                discord_guild_id: discord_guild_id,
                moderation_mode: GuildConfigModerationMode::default(),
                ai_chat_mode: GuildConfigAiChatMode::default(),
                ai_chat_channels: GuildConfigAiChatChannels::default(),
            }
        ).await?;

        Ok(guild_config)
    }

    pub async fn ensure(
        discord_guild_id: serenity::GuildId,
    ) -> Result<GuildConfig, Error> {
        match GuildConfig::fetch(discord_guild_id).await? {
            Some(guild_config) => Ok(guild_config),
            None => Ok(GuildConfig::create(discord_guild_id).await?),
        }
    }

    pub async fn update(
        &self,
        update_document: mongodb::bson::Document,
    ) -> Result<(), Error> {
        let discord_guild_id: String = self.discord_guild_id.get().to_string();

        let database_name = get_database_name();
        let collection_name = get_guilds_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let filter = mongodb::bson::doc! {
            "discord_guild_id": discord_guild_id,
        };

        collection_helper.update::<GuildConfig>(filter, update_document).await?;

        Ok(())
    }

    pub async fn delete(
        self,
    ) -> Result<(), Error> {
        let discord_guild_id: String = self.discord_guild_id.get().to_string();

        let database_name = get_database_name();
        let collection_name = get_guilds_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let filter = mongodb::bson::doc! {
            "discord_guild_id": discord_guild_id,
        };

        collection_helper.delete::<GuildConfig>(filter).await?;

        Ok(())
    }

    pub async fn get_discord_guild_id(
        &self,
    ) -> serenity::GuildId {
        self.discord_guild_id
    }

    pub async fn get_ai_chat_mode(
        &self,
    ) -> GuildConfigAiChatMode {
        self.ai_chat_mode.clone()
    }

    pub async fn set_ai_chat_mode(
        &self,
        ai_chat_mode: GuildConfigAiChatMode,
    ) -> Result<(), Error> {
        self.update(
            mongodb::bson::doc! {
                "$set": {
                    "ai_chat_mode": to_bson(&ai_chat_mode)?,
                },
            }
        ).await?;

        Ok(())
    }

    pub async fn get_ai_chat_channels(
        &self,
    ) -> GuildConfigAiChatChannels {
        self.ai_chat_channels.clone()
    }

    pub async fn set_ai_chat_channels(
        &self,
        ai_chat_channels: GuildConfigAiChatChannels,
    ) -> Result<(), Error> {
        self.update(
            mongodb::bson::doc! {
                "$set": {
                    "ai_chat_channels": to_bson(&ai_chat_channels)?,
                },
            }
        ).await?;

        Ok(())
    }
}
