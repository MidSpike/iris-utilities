//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::{Data, Error};

pub mod configuration {
    pub mod setup;
}

pub mod fun {
    pub mod ask;

    pub mod cards;

    pub mod color;

    pub mod coin_flip;

    pub mod dad_joke;

    pub mod magic_ball;

    pub mod poll;

    pub mod random_animal;

    pub mod random_color;

    pub mod random_furry;

    pub mod random_identity;

    pub mod roast;

    pub mod roll_dice;

    pub mod sauce;

    pub mod would_you;
}

pub mod info {
    pub mod help;

    pub mod feedback;

    pub mod info;

    pub mod invite;

    pub mod ping;
}

pub mod moderation {
    pub mod ban;
    pub mod unban;

    pub mod bans;

    pub mod deafen;
    pub mod undeafen;

    pub mod disconnect;

    pub mod kick;

    pub mod mute;
    pub mod unmute;

    pub mod purge;

    pub mod slowmode;

    pub mod timeout;
    pub mod untimeout;

    pub mod warn;

    pub mod yeet;

    pub mod yoink;
}

pub mod music {
    pub mod filters;

    pub mod play;

    pub mod queue;

    pub mod seek;

    pub mod skip;

    pub mod stop;

    pub mod summon;

    pub mod volume;
}

pub mod utility {
    pub mod channel_info;

    pub mod ip_info;

    pub mod member_info;

    pub mod minecraft_info;

    pub mod role_info;

    pub mod server_info;

    pub mod solve;

    pub mod text_to_speech;

    pub mod translate;

    pub mod unicode_info;
}

fn get_enabled_command_categories() -> Vec<String> {
    std::env::var("ENABLED_COMMAND_CATEGORIES")
    .expect("Environment variable ENABLED_COMMAND_CATEGORIES not set")
    .split(',')
    .map(|s| s.trim().to_lowercase())
    .collect::<Vec<String>>()
}

pub fn is_command_category_enabled(category: &str) -> bool {
    let categories = get_enabled_command_categories();

    categories.contains(&category.to_lowercase())
}

pub fn create_commands() -> Vec<poise::Command<Data, Error>> {
    let mut commands_to_register = vec![];

    if is_command_category_enabled("configuration") {
        commands_to_register.extend(vec![
            configuration::setup::setup(),
        ]);
    }

    if is_command_category_enabled("info") {
        commands_to_register.extend(vec![
            info::help::help(),
            info::feedback::feedback(),
            info::info::info(),
            info::invite::invite(),
            info::ping::ping(),
        ]);
    }

    if is_command_category_enabled("utility") {
        commands_to_register.extend(vec![
            utility::channel_info::channel_info(),
            utility::server_info::server_info(),
            utility::ip_info::ip_info(),
            utility::member_info::member_info(),
            utility::member_info::member_info_user_context_menu(),
            utility::minecraft_info::minecraft_info(),
            utility::role_info::role_info(),
            utility::solve::solve(),
            utility::translate::translate(),
            utility::translate::translate_message_context_menu(),
            // utility::text_to_speech::text_to_speech(), // Disabled pending replacement lavalink plugin
            utility::unicode_info::unicode_info(),
        ]);
    }

    if is_command_category_enabled("moderation") {
        commands_to_register.extend(vec![
            moderation::ban::ban(),
            moderation::bans::bans(),
            moderation::deafen::deafen(),
            moderation::disconnect::disconnect(),
            moderation::kick::kick(),
            moderation::mute::mute(),
            moderation::purge::purge(),
            moderation::slowmode::slowmode(),
            moderation::timeout::timeout(),
            moderation::unban::unban(),
            moderation::undeafen::undeafen(),
            moderation::unmute::unmute(),
            moderation::untimeout::untimeout(),
            moderation::warn::warn(),
            moderation::yeet::yeet(),
            moderation::yoink::yoink(),
        ]);
    }

    if is_command_category_enabled("fun") {
        commands_to_register.extend(vec![
            fun::ask::ask(),
            fun::cards::cards(),
            fun::coin_flip::coin_flip(),
            fun::color::color(),
            fun::dad_joke::dad_joke(),
            fun::magic_ball::magic_ball(),
            fun::poll::poll(),
            fun::random_animal::random_animal(),
            fun::random_color::random_color(),
            fun::random_furry::random_furry(),
            fun::random_identity::random_identity(),
            fun::roast::roast(),
            fun::roll_dice::roll_dice(),
            fun::sauce::sauce(),
            fun::would_you::would_you(),
        ]);
    }

    if is_command_category_enabled("music") {
        commands_to_register.extend(vec![
            music::filters::filters(),
            music::play::play(),
            music::queue::queue(),
            music::seek::seek(),
            music::skip::skip(),
            music::stop::stop(),
            music::summon::summon(),
            music::volume::volume(),
        ]);
    }

    commands_to_register
}
