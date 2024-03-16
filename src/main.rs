//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

#![allow(clippy::needless_return)]
#![allow(clippy::println_empty_string)]
#![allow(clippy::redundant_field_names)]

//------------------------------------------------------------//

use dotenv::dotenv;

use lavalink_rs::prelude::*;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

pub mod commands;

pub mod common;

pub mod events;

use crate::common::helpers::libre_translate;

use crate::events::event_handler::event_handler;

use crate::common::telemetry::anonymous_command_log::telemetry_anonymous_command_log;

//------------------------------------------------------------//

pub struct DefaultAllowedMentions;

impl DefaultAllowedMentions {
    pub fn new() -> serenity::CreateAllowedMentions {
        serenity::CreateAllowedMentions::default()
        .replied_user(true)
        .all_users(false)
        .all_roles(false)
        .everyone(false)
    }
}

//------------------------------------------------------------//

pub struct Data {
    pub lavalink: LavalinkClient,
    pub libre_translate_supported_languages: Vec<libre_translate::LibreTranslateLanguage>,
}

pub type Error = Box<dyn std::error::Error + Send + Sync>;

// pub type Context<'a> = poise::Context<'a, Data, Error>;
pub type Context<'a> = poise::ApplicationContext<'a, Data, Error>;

//------------------------------------------------------------//

#[tokio::main]
async fn main() {
    dotenv().ok(); // Load environment variables from .env file

    common::database::db::test_database().await.unwrap();

    let songbird_arc = songbird::Songbird::serenity();

    let framework_options = poise::FrameworkOptions {
        allowed_mentions: Some(DefaultAllowedMentions::new()),
        commands: vec![
            commands::configuration::setup::setup(),
            commands::fun::cards::cards(),
            commands::fun::coin_flip::coin_flip(),
            commands::fun::color::color(),
            commands::fun::dad_joke::dad_joke(),
            commands::fun::fact_check::fact_check(),
            commands::fun::gpt::gpt(),
            commands::fun::magic_ball::magic_ball(),
            commands::fun::poll::poll(),
            commands::fun::random_animal::random_animal(),
            commands::fun::random_color::random_color(),
            commands::fun::random_furry::random_furry(),
            commands::fun::roast::roast(),
            commands::fun::roll_dice::roll_dice(),
            commands::fun::would_you::would_you(),
            commands::info::help::help(),
            commands::info::feedback::feedback(),
            commands::info::info::info(),
            commands::info::invite::invite(),
            commands::info::ping::ping(),
            commands::moderation::ban::ban(),
            commands::moderation::bans::bans(),
            commands::moderation::deafen::deafen(),
            commands::moderation::disconnect::disconnect(),
            commands::moderation::kick::kick(),
            commands::moderation::mute::mute(),
            commands::moderation::purge::purge(),
            commands::moderation::timeout::timeout(),
            commands::moderation::unban::unban(),
            commands::moderation::undeafen::undeafen(),
            commands::moderation::unmute::unmute(),
            commands::moderation::untimeout::untimeout(),
            commands::moderation::warn::warn(),
            commands::moderation::yeet::yeet(),
            commands::moderation::yoink::yoink(),
            commands::music::play::play(),
            commands::music::queue::queue(),
            commands::music::seek::seek(),
            commands::music::skip::skip(),
            commands::music::stop::stop(),
            commands::music::summon::summon(),
            commands::music::volume::volume(),
            commands::utility::channel_info::channel_info(),
            commands::utility::guild_info::guild_info(),
            commands::utility::ip_info::ip_info(),
            commands::utility::member_info::member_info(),
            commands::utility::member_info::member_info_user_context_menu(),
            commands::utility::minecraft_info::minecraft_info(),
            commands::utility::role_info::role_info(),
            commands::utility::solve::solve(),
            commands::utility::translate::translate(),
            commands::utility::translate::translate_message_context_menu(),
            commands::utility::text_to_speech::text_to_speech(),
            commands::utility::unicode_info::unicode_info(),
        ],
        event_handler: |ctx, event, framework, data| {
            Box::pin(
                event_handler(ctx, event, framework, data)
            )
        },
        pre_command: |ctx| {
            // This will run before every command invocation
            Box::pin(
                async move {
                    match ctx {
                        poise::Context::Application(ctx) => {
                            let command = ctx.invocation_string();
                            telemetry_anonymous_command_log(&ctx, command).await;
                        },

                        _ => {}, // ignore other types of contexts
                    }
                }
            )
        },
        ..Default::default()
    };

    let framework =
        poise::Framework::builder()
        .options(framework_options)
        .setup(
            // Dear Poise developers, extract this
            // parameter's signature into a type alias
            // to allow me to move this out of here.
            |ctx, _ready, framework| {
                Box::pin(
                    async move {
                        poise::builtins::register_globally(ctx, &framework.options().commands).await?;

                        let lavalink_rs_events = lavalink_rs::model::events::Events::default();

                        let lavalink_rs_hostname =
                            std::env::var("LAVALINK_HOSTNAME")
                            .expect("Environment variable LAVALINK_HOSTNAME not set");

                        let lavalink_rs_password =
                            std::env::var("LAVALINK_PASSWORD")
                            .expect("Environment variable LAVALINK_PASSWORD not set");

                        let lavalink_rs_node = NodeBuilder {
                            is_ssl: false,
                            hostname: lavalink_rs_hostname,
                            password: lavalink_rs_password,
                            user_id: lavalink_rs::model::UserId(ctx.cache.current_user().id.get()),
                            events: lavalink_rs_events.to_owned(),
                            session_id: None,
                        };

                        let lava_link_rs_client = LavalinkClient::new(
                            lavalink_rs_events,
                            vec![lavalink_rs_node],
                            NodeDistributionStrategy::sharded(),
                        ).await;

                        let supported_libre_langs =
                            libre_translate::fetch_supported_languages().await?;

                        Ok(
                            Data {
                                lavalink: lava_link_rs_client,
                                libre_translate_supported_languages: supported_libre_langs,
                            }
                        )
                    }
                )
            }
        )
        .build();

    let discord_token =
        std::env::var("DISCORD_TOKEN")
        .expect("Environment variable DISCORD_TOKEN not set");

    let intents =
        serenity::GatewayIntents::GUILDS |
        serenity::GatewayIntents::GUILD_MESSAGES |
        serenity::GatewayIntents::DIRECT_MESSAGES |
        serenity::GatewayIntents::GUILD_MESSAGE_REACTIONS |
        serenity::GatewayIntents::GUILD_VOICE_STATES |
        serenity::GatewayIntents::GUILD_MEMBERS | // privileged intent
        serenity::GatewayIntents::MESSAGE_CONTENT; // privileged intent

    let client: serenity::ClientBuilder =
        serenity::ClientBuilder::new(discord_token, intents)
        .voice_manager_arc(songbird_arc.clone())
        .type_map_insert::<songbird::SongbirdKey>(songbird_arc)
        .framework(framework);

    client.await.unwrap().start().await.unwrap();
}
