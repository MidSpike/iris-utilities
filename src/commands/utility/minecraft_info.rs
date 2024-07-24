//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

const MINECRAFT_SERVER_INFO_API_URL: &str = "https://api.mcsrvstat.us/2/";

const MINECRAFT_PLAYER_INFO_API_URL: &str = "https://playerdb.co/api/player/minecraft/";

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftServerInfoDebug {
    // the `ping` field should always be present in the response
    // when `true` it means the api fetch was successful
    // when `false` it means the api fetch failed
    ping: bool,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftServerInfoMessageOfTheDay {
    raw: Vec<String>,
    clean: Vec<String>,
    html: Vec<String>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftServerInfoPlayers {
    online: i32,
    max: i32,
}

/// 200 OK from `MINECRAFT_SERVER_INFO_API_URL`
#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftServerInfoApiResponse {
    // the `debug` field should always be present in the response
    debug: MinecraftServerInfoDebug,
    #[serde(default)]
    ip: String,
    #[serde(default)]
    port: i32,
    #[serde(default)]
    hostname: String,
    #[serde(default)]
    icon: String,
    #[serde(default)]
    version: String,
    #[serde(default)]
    protocol_name: String,
    #[serde(default)]
    online: bool,
    #[serde(default)]
    players: MinecraftServerInfoPlayers,
    #[serde(default)]
    motd: MinecraftServerInfoMessageOfTheDay,
}

async fn fetch_server_info(
    server_address: &str, // example: "mc.hypixel.net" or a valid ip address
) -> Result<MinecraftServerInfoApiResponse, Error> {
    let url = format!("{}{}", MINECRAFT_SERVER_INFO_API_URL, urlencoding::encode(server_address));

    let response = reqwest::get(&url).await?;

    let response_status = response.status();

    if !response_status.is_success() {
        return Err("Network request failed".into());
    }

    let server_info: MinecraftServerInfoApiResponse = response.json().await?;

    return Ok(server_info);
}

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftPlayerMeta {
    cached_at: u64, // unix epoch in seconds
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftPlayer {
    id: String, // uuid separated by hyphens
    username: String,
    avatar: String, // url to the user's avatar
    meta: MinecraftPlayerMeta,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftPlayerData {
    // sometimes the `player` field is not present in the response
    #[serde(default)]
    player: MinecraftPlayer,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct MinecraftPlayerInfoApiResponse {
    // the `success` field should always be present in the response
    success: bool,
    // the `code` field should always be present in the response
    code: String,
    // the `data` field should always be present in the response
    data: MinecraftPlayerData,

}

async fn fetch_player_info(
    player_name: &str, // example: "MidSpike"
) -> Result<MinecraftPlayerInfoApiResponse, Error> {
    let url = format!("{}{}", MINECRAFT_PLAYER_INFO_API_URL, urlencoding::encode(player_name));

    let response = reqwest::get(&url).await?;

    let response_status = response.status();

    if !response_status.is_success() {
        return Err("Network request failed".into());
    }

    let player_info: MinecraftPlayerInfoApiResponse = response.json().await?;

    return Ok(player_info);
}

//------------------------------------------------------------//

/// Fetch info about a minecraft server.
#[poise::command(slash_command)]
pub async fn server(
    ctx: Context<'_>,

    #[description = "The server address to lookup"]
    server_address: String,
) -> Result<(), Error> {
    let server_info = match fetch_server_info(&server_address).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{}", e);

            ctx.say("An error occurred while fetching server info.").await?;

            return Ok(());
        },
    };

    let server_info_motd_clean =
        server_info
        .motd
        .clean
        .iter()
        .map(|m| m.trim())
        .collect::<Vec<&str>>()
        .join("\n");

    let embed_title = format!("MC Server Info for {}", server_address);

    let embed = if server_info.debug.ping {
        let address_or_hostname =
            if server_info.hostname.is_empty() { server_info.ip }
            else { server_info.hostname };

        let embed_fields = vec![
            (
                "Address / Hostname",
                format!("```{}```", address_or_hostname),
                false,
            ),
            (
                "Port",
                format!("`{}`", server_info.port),
                true,
            ),
            (
                "Version",
                format!("`{}`", server_info.version),
                true,
            ),
            (
                "Protocol",
                format!("`{}`", server_info.protocol_name),
                true,
            ),
            ( // filler field to make the embed look nicer
                "\u{200b}",
                "\u{200b}".to_string(),
                true,
            ),
            (
                "Player Count",
                format!("{} / {}", server_info.players.online, server_info.players.max),
                true,
            ),
            ( // filler field to make the embed look nicer
                "\u{200b}",
                "\u{200b}".to_string(),
                true,
            ),
            ( // filler field to make the embed look nicer
                "\u{200b}",
                "\u{200b}".to_string(),
                true,
            ),
            (
                "Message of the Day",
                format!("```\n{}\n```", server_info_motd_clean),
                false,
            ),
        ];

        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(embed_title)
        .fields(embed_fields)
    } else {
        let embed_description = indoc::formatdoc!(
            r#"
                Server `{server_address}` failed to respond.
                This could be because the server is offline or the server address is invalid.
            "#,
            server_address = server_address,
        );

        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(embed_title)
        .description(embed_description)
    };

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    Ok(())
}

/// Fetch info about a minecraft player.
#[poise::command(slash_command)]
pub async fn player(
    ctx: Context<'_>,

    #[description = "The player name to lookup"]
    player_name: String,
) -> Result<(), Error> {
    let player_info = match fetch_player_info(&player_name).await {
        Ok(p) => p,
        Err(e) => {
            eprintln!("{}", e);

            ctx.say("An error occurred while fetching player info.").await?;

            return Ok(());
        },
    };

    let embed_title = format!("MC Player Info for {}", player_name);

    let embed = if player_info.success {
        let url_encoded_player_uuid = urlencoding::encode(&player_info.data.player.id);

        let avatar_image_url =
            format!("https://crafatar.com/avatars/{}?overlay=true", url_encoded_player_uuid);

        let body_image_url =
            format!("https://crafatar.com/renders/body/{}?overlay=true", url_encoded_player_uuid);

        let skin_image_url =
            format!("https://crafatar.com/skins/{}", url_encoded_player_uuid);

        let embed_fields = vec![
            (
                "Username",
                format!("```{}```", player_info.data.player.username),
                false,
            ),
            (
                "Uuid",
                format!("```{}```", player_info.data.player.id),
                false,
            ),
            (
                "Avatar",
                format!("[link]({})", avatar_image_url),
                true,
            ),
            (
                "Body",
                format!("[link]({})", body_image_url),
                true,
            ),
            (
                "Skin",
                format!("[link]({})", skin_image_url),
                true,
            ),
        ];

        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(embed_title)
        .fields(embed_fields)
    } else {
        let embed_description = indoc::formatdoc!(
            r#"
                Failed to fetch info for player `{player_name}`.
                This could be because the player does not exist or the player name is invalid.
            "#,
            player_name = player_name,
        );

        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(embed_title)
        .description(embed_description)
    };

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    Ok(())
}

/// Collection of minecraft info commands.
#[
    poise::command(
        slash_command,
        subcommands("server", "player"),
        category = "Utility",
        global_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn minecraft_info(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
