//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use tokio_stream::StreamExt;

use crate::common::database::interfaces::guild_config::GuildConfig;

use crate::Error;

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

pub async fn get_client() -> mongodb::Client {
    let client_options =
        mongodb::options::ClientOptions::parse(get_connection_url()).await
        .expect("Failed to parse mongodb connection url");

    mongodb::Client::with_options(client_options)
    .expect("Failed to create mongodb client")
}

//------------------------------------------------------------//

pub struct CollectionHelper {
    database_name: String,
    collection_name: String,
}

impl CollectionHelper {
    pub fn new(
        database_name: String,
        collection_name: String
    ) -> Self {
        Self {
            database_name,
            collection_name,
        }
    }

    pub async fn get<Item>(
        &self,
        filter: Option<mongodb::bson::Document>,
    ) -> Result<Option<Item>, Error>
    where
        Item: serde::de::DeserializeOwned + Unpin + Send + Sync,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        let mut cursor = collection.find(filter, None).await?;

        let item = cursor.next().await.transpose()?;

        Ok(item)
    }

    pub async fn set<Item>(
        &self,
        item: Item,
    ) -> Result<Item, Error>
    where
        Item: serde::Serialize,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.insert_one(&item, None).await?;

        Ok(item)
    }

    pub async fn update<Item>(
        &self,
        filter: mongodb::bson::Document,
        update_document: mongodb::bson::Document,
    ) -> Result<(), Error>
    where
        Item: serde::Serialize,
    {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.update_one(filter, update_document, None).await?;

        Ok(())
    }

    pub async fn delete<Item>(
        &self,
        filter: mongodb::bson::Document,
    ) -> Result<(), Error> {
        let client = get_client().await;
        let db = client.database(&self.database_name);
        let collection = db.collection::<Item>(&self.collection_name);

        collection.delete_one(filter, None).await?;

        Ok(())
    }
}

//------------------------------------------------------------//

pub async fn test_database() -> Result<(), Error> {
    println!("Testing database interfaces...");

    {
        println!("Testing guild config...");
        let guild_id = "069420123456789"; // Hopefully this guild id doesn't exist

        println!("Ensuring guild config...");
        let guild_config = GuildConfig::ensure(guild_id.into()).await?;
        println!("Ensured guild config: {:?}", guild_config);

        println!("Confirming guild config exists...");
        match GuildConfig::fetch(guild_id.into()).await? {
            Some(guild_config) => {
                println!("Guild config exists: {:?}", guild_config);
            },
            None => {
                panic!("Guild config should exist.");
            },
        }
        println!("Confirmed guild config exists.");

        println!("Deleting guild config...");
        guild_config.delete().await?;
        println!("Deleted guild config.");

        println!("Confirming guild config is deleted...");
        let guild_config = GuildConfig::fetch(guild_id.into()).await?;
        if guild_config.is_some() {
            panic!("Guild config should not exist.");
        }
        println!("Confirmed guild config is deleted.");

        println!("Finished testing guild config.");
    }

    return Ok(());
}
