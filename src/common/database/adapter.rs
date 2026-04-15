//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use tokio::sync::OnceCell;

use tokio_stream::StreamExt;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::common::database::interfaces::guild_config::GuildConfig;
use crate::common::database::interfaces::user_config::UserConfig;

//------------------------------------------------------------//

pub fn get_connection_url() -> String {
    std::env::var("MONGODB_CONNECTION_URL")
    .expect("MONGODB_CONNECTION_URL must be set")
}

pub fn get_database_name() -> String {
    std::env::var("MONGODB_DATABASE_NAME")
    .expect("MONGODB_DATABASE_NAME must be set")
}

pub fn get_guilds_collection_name() -> String {
    std::env::var("MONGODB_GUILDS_COLLECTION_NAME")
    .expect("MONGODB_GUILDS_COLLECTION_NAME must be set")
}

pub fn get_users_collection_name() -> String {
    std::env::var("MONGODB_USERS_COLLECTION_NAME")
    .expect("MONGODB_USERS_COLLECTION_NAME must be set")
}

//------------------------------------------------------------//

static CLIENT: OnceCell<mongodb::Client> = OnceCell::const_new();

pub async fn get_client() -> &'static mongodb::Client {
    CLIENT.get_or_init(|| async {
        let client_options =
            mongodb::options::ClientOptions::parse(get_connection_url()).await
            .expect("Failed to parse mongodb connection url");

        mongodb::Client::with_options(client_options)
        .expect("Failed to create mongodb client")
    }).await
}

//------------------------------------------------------------//

pub struct CollectionHelper {
    database_name: String,
    collection_name: String,
}

impl CollectionHelper {
    pub fn new(
        database_name: String,
        collection_name: String,
    ) -> Self {
        Self {
            database_name,
            collection_name,
        }
    }

    pub async fn get<Item> (
        &self,
        filter: mongodb::bson::Document,
    ) -> Result<Option<Item>, mongodb::error::Error>
    where
        Item: serde::de::DeserializeOwned + Unpin + Send + Sync,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        let mut cursor = collection.find(filter).await?;

        cursor.next().await.transpose()
    }

    pub async fn set<Item>(
        &self,
        item: Item,
    ) -> Result<Item, mongodb::error::Error>
    where
        Item: serde::Serialize + Send + Sync,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.insert_one(&item).await?;

        Ok(item)
    }

    pub async fn update<Item>(
        &self,
        filter: mongodb::bson::Document,
        update_document: mongodb::bson::Document,
    ) -> Result<(), mongodb::error::Error>
    where
        Item: serde::Serialize + Send + Sync,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.update_one(filter, update_document).await?;

        Ok(())
    }

    pub async fn delete<Item>(
        &self,
        filter: mongodb::bson::Document,
    ) -> Result<(), mongodb::error::Error>
    where
        Item: serde::Serialize + Send + Sync,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.delete_one(filter).await?;

        Ok(())
    }
}

//------------------------------------------------------------//

pub async fn test() -> Result<(), Error> {
    println!("[TEST] Testing database interfaces...");

    {
        println!("[TEST] Testing guild config...");
        let test_guild_id = serenity::GuildId::default();

        println!("[TEST] Ensuring guild config...");
        GuildConfig::ensure(test_guild_id).await?;

        println!("[TEST] Confirming guild config exists...");
        let Some(test_guild_config) = GuildConfig::fetch(test_guild_id).await? else {
            panic!("[TEST] Guild config does not exist!");
        };

        println!("[TEST] Guild config exists: {test_guild_config:#?}");

        println!("[TEST] Deleting guild config...");
        if let Err(why) = test_guild_config.delete().await {
            panic!("[TEST] Failed to delete guild config!\nError: {why:#}");
        }

        println!("[TEST] Confirming guild config is deleted...");
        if let Some(_) = GuildConfig::fetch(test_guild_id).await? {
            panic!("[TEST] Guild config still exists after deletion!");
        }

        println!("[TEST] Finished testing guild config.");
    }

    {
        println!("[TEST] Testing user config...");
        let test_user_id = serenity::UserId::default();

        println!("[TEST] Ensuring user config...");
        UserConfig::ensure(test_user_id).await?;

        println!("[TEST] Confirming user config exists...");
        let Some(test_user_config) = UserConfig::fetch(test_user_id).await? else {
            panic!("[TEST] User config does not exist!");
        };

        println!("[TEST] User config exists: {test_user_config:#?}");

        println!("[TEST] Deleting user config...");
        if let Err(why) = test_user_config.delete().await {
            panic!("[TEST] Failed to delete user config!\nError: {why:#}");
        }

        println!("[TEST] Confirming user config is deleted...");
        let Some(_) = UserConfig::fetch(test_user_id).await? else {
            panic!("[TEST] User config still exists after deletion!");
        };

        println!("[TEST] Finished testing user config.");
    }

    println!("[TEST] Finished testing database interfaces.");

    Ok(())
}
