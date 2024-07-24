//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use mongodb::bson::to_bson;

use serde::{Deserialize, Serialize};

//------------------------------------------------------------//

use crate::Error;

use crate::common::database::db::get_database_name;

use crate::common::database::db::get_users_collection_name;

use crate::common::database::db::CollectionHelper;

//------------------------------------------------------------//

#[derive(Debug, Deserialize, Serialize)]
pub struct UserConfig {
    discord_user_id: String,

    #[serde(default)]
    discord_entitlements_cache: Vec<String>,

    #[serde(default)]
    discord_entitlements_cache_last_updated: Option<chrono::DateTime<chrono::Utc>>,

    #[serde(default)]
    gpt_tokens_used: u32,

    #[serde(default)]
    gpt_tokens_used_last_regeneration: chrono::DateTime<chrono::Utc>,

}

impl UserConfig {
    pub async fn fetch(
        discord_user_id: String,
    ) -> Result<Option<UserConfig>, Error> {
        let database_name = get_database_name();
        let collection_name = get_users_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let user_config = collection_helper.get(
            mongodb::bson::doc! {
                "discord_user_id": discord_user_id,
            }
        ).await?;

        Ok(user_config)
    }

    pub async fn create(
        discord_user_id: String,
    ) -> Result<UserConfig, Error> {
        let database_name = get_database_name();
        let collection_name = get_users_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let user_config = collection_helper.set(
            UserConfig {
                discord_user_id: discord_user_id.clone(),
                discord_entitlements_cache: Vec::default(),
                discord_entitlements_cache_last_updated: None,
                gpt_tokens_used: u32::default(),
                gpt_tokens_used_last_regeneration: chrono::Utc::now(),
            }
        ).await?;

        Ok(user_config)
    }

    pub async fn ensure(
        discord_user_id: String,
    ) -> Result<UserConfig, Error> {
        match UserConfig::fetch(discord_user_id.clone()).await? {
            Some(user_config) => Ok(user_config),
            None => Ok(UserConfig::create(discord_user_id).await?),
        }
    }

    pub async fn update(
        &self,
        update_document: mongodb::bson::Document,
    ) -> Result<(), Error> {
        let database_name = get_database_name();
        let collection_name = get_users_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let filter = mongodb::bson::doc! {
            "discord_user_id": &self.discord_user_id,
        };

        collection_helper.update::<UserConfig>(filter, update_document).await?;

        Ok(())
    }

    pub async fn delete(
        self,
    ) -> Result<(), Error> {
        let database_name = get_database_name();
        let collection_name = get_users_collection_name();
        let collection_helper = CollectionHelper::new(database_name, collection_name);
        let filter = mongodb::bson::doc! {
            "discord_user_id": self.discord_user_id,
        };

        collection_helper.delete::<UserConfig>(filter).await?;

        Ok(())
    }

    pub async fn get_discord_user_id(
        &self,
    ) -> String {
        self.discord_user_id.clone()
    }

    /// Returns the number of GPT tokens used by this user.
    pub async fn get_gpt_tokens_used(
        &self,
    ) -> u32 {
        self.gpt_tokens_used
    }

    /// Increments the number of GPT tokens used by this user.
    pub async fn increment_gpt_tokens_used(
        &self,
        increment_by: u32,
    ) -> Result<(), Error> {
        self.update(
            mongodb::bson::doc! {
                "$inc": {
                    "gpt_tokens_used": increment_by,
                },
            }
        ).await?;

        Ok(())
    }

    /// Resets the amount of GPT tokens used by this user to `0`.
    pub async fn reset_gpt_tokens_used(
        &self,
    ) -> Result<(), Error> {
        self.update(
            mongodb::bson::doc! {
                "$set": {
                    "gpt_tokens_used": 0,
                    "gpt_tokens_used_last_regeneration": to_bson(&chrono::Utc::now())?,
                },
            }
        ).await?;

        Ok(())
    }

    /// Returns the last time this user's GPT tokens were regenerated.
    pub async fn get_gpt_tokens_used_last_regeneration(
        &self,
    ) -> chrono::DateTime<chrono::Utc> {
        self.gpt_tokens_used_last_regeneration
    }
}
