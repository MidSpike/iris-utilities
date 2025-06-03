//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use derive_more::Display;

use sysinfo::System;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::time::format_duration;
use crate::common::helpers::bot::{fetch_my_guild_invite_url, generate_bot_invite_url};

//------------------------------------------------------------//

/// Values are powers of 1024.
///
/// Therefore:
/// - `Byte` is 1024^0
/// - `KiloByte` is 1024^1
/// - `MegaByte` is 1024^2
/// - etc.
#[allow(dead_code)]
#[derive(Clone, Copy, Display)]
enum MemoryUnit {
    #[display("B")]
    Byte = 0,
    #[display("KB")]
    KiloByte = 1,
    #[display("MB")]
    MegaByte = 2,
    #[display("GB")]
    GigaByte = 3,
    #[display("TB")]
    TeraByte = 4,
}

struct MemoryValue(u64);

impl MemoryValue {
    fn _scale_to_power(
        &self,
        power: u32,
    ) -> f64 {
        return (self.0 as f64) / (u32::pow(1024, power) as f64);
    }

    fn display(
        &self,
        unit: MemoryUnit,
    ) -> String {
        let value = self._scale_to_power(unit as u32);

        return format!("{:.1} {}", value, unit);
    }
}

struct MemoryInfo {
    total: MemoryValue,
    used: MemoryValue,
    free: MemoryValue,
}

struct SystemInfo {
    os_name: String,
    uptime: std::time::Duration,
    memory: MemoryInfo,
}

impl SystemInfo {
    fn new() -> Self {
        let mut system = System::new_all();

        system.refresh_all();

        let os_name =
            System::long_os_version()
            .unwrap_or(String::from("Unknown"));

        let uptime = std::time::Duration::from_secs(System::uptime());

        let memory = MemoryInfo {
            total: MemoryValue(system.total_memory()),
            used: MemoryValue(system.used_memory()),
            free: MemoryValue(system.free_memory()),
        };

        return Self {
            os_name: os_name,
            uptime: uptime,
            memory: memory,
        };
    }
}

//------------------------------------------------------------//

/// View information about this bot.
#[
    poise::command(
        slash_command,
        category = "Help and Info",
    )
]
pub async fn info(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let shard_manager =
        ctx
        .framework()
        .shard_manager();

    let shard_runners = shard_manager.runners.lock().await;

    let shard_pings =
        shard_runners
        .iter()
        .map(|(shard_id, shard_info)| (shard_id, shard_info.latency))
        .collect::<Vec<_>>();

    let shard_pings_string =
        shard_pings
        .iter()
        .map(|(shard_id, latency)| {
            format!(
                "Shard `{}`: `{}`",
                shard_id,
                latency.map_or(
                    "unknown".to_string(),
                    |latency| format!("{}ms", latency.as_millis())
                ),
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let me = ctx.serenity_context().http.get_current_application_info().await?;

    let my_name = &me.name;
    let my_id = &me.id;
    let my_creation_epoch = my_id.created_at().timestamp();

    let my_bio = match &me.description.len() {
        0 => "No bio found",
        _ => &me.description,
    };

    let my_owner: serenity::User = match &me.team {
        Some(team) =>
            ctx
            .serenity_context()
            .http
            .get_user(team.owner_user_id)
            .await?,
        _ => me.owner.expect("Failed to fetch application owner"),
    };

    let my_owner_name = &my_owner.global_name.unwrap_or(my_owner.name);
    let my_owner_id = &my_owner.id;

    let my_invite_url = generate_bot_invite_url((*my_id).into());

    let my_support_server_invite = fetch_my_guild_invite_url(ctx).await?;

    let my_tos_url = match &me.terms_of_service_url {
        Some(url) => url,
        _ => "https://discord.com/terms",
    };
    let my_pp_url = match &me.privacy_policy_url {
        Some(url) => url,
        _ => "https://discord.com/privacy",
    };

    let system_info = SystemInfo::new();

    let title = format!("Hello world, I'm {}!", my_name);
    let description = indoc::formatdoc!(
        r#"
            I was created by {bot_owner_name} (`{bot_owner_id}`) {bot_birthday}.

            **About Me**
            {bot_bio}

            **System Info**
            Operating System: {os_name}
            Uptime: {uptime}
            Total Memory: {memory_total}
            Used Memory: {memory_used}
            Free Memory: {memory_free}

            **Shard Latencies**
            {shard_latencies}
        "#,
        bot_owner_name = my_owner_name,
        bot_owner_id = my_owner_id,
        bot_birthday = format!("<t:{}:R> on <t:{}:D>", my_creation_epoch, my_creation_epoch),
        bot_bio = my_bio,
        os_name = system_info.os_name,
        uptime = format_duration(system_info.uptime),
        memory_total = system_info.memory.total.display(MemoryUnit::GigaByte),
        // TODO: make dynamic based on usage
        memory_used = system_info.memory.used.display(MemoryUnit::MegaByte),
        memory_free = system_info.memory.free.display(MemoryUnit::GigaByte),
        shard_latencies = shard_pings_string,
    );

    let num_commands = ctx.framework().options().commands.len();
    let num_shards = ctx.serenity_context().cache.shard_count();
    let num_cached_guilds = ctx.serenity_context().cache.guild_count();
    let num_cached_users = ctx.serenity_context().cache.user_count();
    let num_cached_channels = ctx.serenity_context().cache.guild_channel_count();

    let invite_button_label = "Invite Me!";
    let support_server_button_label = "Support Server";

    let tos_button_label = "Terms of Service";
    let pp_button_label = "Privacy Policy";

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(title)
            .description(description)
            .fields(vec![
                (
                    "Shards",
                    format!("`{}`", num_shards),
                    true,
                ),
                (
                    "Commands",
                    format!("`{}`", num_commands),
                    true,
                ),
                (
                    "Cached Guilds",
                    format!("`{}`", num_cached_guilds),
                    true,
                ),
                (
                    "Cached Users",
                    format!("`{}`", num_cached_users),
                    true,
                ),
                (
                    "Cached Channels",
                    format!("`{}`", num_cached_channels),
                    true,
                ),
            ])
        )
        .components(vec![
            serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new_link(my_invite_url)
                .label(invite_button_label),

                serenity::CreateButton::new_link(my_support_server_invite)
                .label(support_server_button_label),

                serenity::CreateButton::new_link(my_tos_url)
                .label(tos_button_label),

                serenity::CreateButton::new_link(my_pp_url)
                .label(pp_button_label),
            ])
        ])
    ).await?;

    return Ok(());
}
