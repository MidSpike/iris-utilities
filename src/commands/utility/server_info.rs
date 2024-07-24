//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

use serenity::utils::{FormattedTimestamp,FormattedTimestampStyle};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

/// Displays information about this server.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Utility",
    )
]
pub async fn server_info(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let guild = match ctx.guild().map(|g| g.clone()) {
        Some(guild) => guild,
        None => {
            ctx.send(
                poise::CreateReply::default()
                .content("This command can only be used in a guild.")
            ).await?;

            return Ok(());
        }
    };

    let g_name = &guild.name;

    let g_description = &guild.description;

    let g_id = &guild.id;

    let g_id_string = g_id.to_string();

    // although the method is called "vanity_url", it returns a code, not a url.
    let g_vanity_code = guild.vanity_url(ctx).await.ok(); // ignore errors here

    let g_icon_url = guild.icon_url();

    let g_banner_url = guild.banner_url();

    let g_splash_url = guild.splash_url();

    let g_features = &guild.features;

    let g_partnered = g_features.iter().any(|f| f == "PARTNERED");

    let g_verified = g_features.iter().any(|f| f == "VERIFIED");

    let g_community = g_features.iter().any(|f| f == "COMMUNITY");

    let g_discoverable = g_features.iter().any(|f| f == "DISCOVERABLE");

    let g_boost_level: u8 = guild.premium_tier.into();

    let g_boost_count = guild.premium_subscription_count.unwrap_or(0);

    let g_invites_count = guild.invites(ctx).await?.len();

    let g_roles_count = guild.roles.len();

    let g_emojis_count = guild.emojis.len();

    let g_channels_count = guild.channels.len();

    let g_members_count = guild.member_count;

    // Copied from serenity's source code.
    let discord_epoch: u64 = 1_420_070_400_000;

    // Copied from serenity's source code.
    let g_creation_timestamp =
        serenity::Timestamp::from_millis(((g_id.get() >> 22) + discord_epoch) as i64)
        .expect("Should not fail; Failed to create timestamp from guild id.");
    let g_creation_timestamp_relative_format =
        FormattedTimestamp::new(g_creation_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let g_creation_timestamp_full_format =
        FormattedTimestamp::new(g_creation_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let g_rules_channel_id = guild.rules_channel_id;

    let g_public_updates_channel_id = guild.public_updates_channel_id;

    let g_system_channel_id = guild.system_channel_id;

    let g_widget_channel_id = guild.widget_channel_id;

    let mut embed_fields = Vec::new();

    embed_fields.push(
        (
            "Name",
            format!("```\n{}\n```", g_name),
            false,
        )
    );

    if let Some(g_description) = g_description {
        embed_fields.push(
            (
                "Description",
                format!("```\n{}\n```", g_description),
                false,
            )
        );
    }

    embed_fields.push(
        (
            "Snowflake",
            format!("```\n{}\n```", g_id_string),
            false,
        )
    );

    embed_fields.push(
        (
            "Created On",
            format!(
                "{} ({})",
                g_creation_timestamp_full_format,
                g_creation_timestamp_relative_format
            ),
            false,
        )
    );

    if let Some(g_icon_url) = g_icon_url {
        embed_fields.push(
            (
                "Icon",
                format!("[link]({})", g_icon_url),
                true,
            )
        );
    }

    if let Some(g_banner_url) = g_banner_url {
        embed_fields.push(
            (
                "Banner",
                format!("[link]({})", g_banner_url),
                true,
            )
        );
    }

    if let Some(g_splash_url) = g_splash_url {
        embed_fields.push(
            (
                "Splash",
                format!("[link]({})", g_splash_url),
                true,
            )
        );
    }

    if let Some(g_vanity_code) = g_vanity_code {
        // let g_vanity_code =
        //     g_vanity_url.split('/').last()
        //     .expect("Failed to get vanity code from URL");
        let g_vanity_url = format!("https://discord.gg/{}", g_vanity_code);

        embed_fields.push(
            (
                "Vanity",
                format!("[{}]({})", g_vanity_code, g_vanity_url),
                true,
            )
        );
    }

    embed_fields.push(
        (
            "Partnered",
            format!("`{}`", g_partnered),
            true,
        )
    );

    embed_fields.push(
        (
            "Verified",
            format!("`{}`", g_verified),
            true,
        )
    );

    embed_fields.push(
        (
            "Community",
            format!("`{}`", g_community),
            true,
        )
    );

    embed_fields.push(
        (
            "Discoverable",
            format!("`{}`", g_discoverable),
            true,
        )
    );

    embed_fields.push(
        (
            "Boost Level",
            format!("`{}`", g_boost_level),
            true,
        )
    );

    embed_fields.push(
        (
            "Boosts",
            format!("`{}`", g_boost_count),
            true,
        )
    );

    embed_fields.push(
        (
            "Invites",
            format!("`{}`", g_invites_count),
            true,
        )
    );

    embed_fields.push(
        (
            "Roles",
            format!("`{}`", g_roles_count),
            true,
        )
    );

    embed_fields.push(
        (
            "Emojis",
            format!("`{}`", g_emojis_count),
            true,
        )
    );

    embed_fields.push(
        (
            "Channels",
            format!("`{}`", g_channels_count),
            true,
        )
    );

    embed_fields.push(
        (
            "Members",
            format!("`{}`", g_members_count),
            true,
        )
    );

    if let Some(g_rules_channel_id) = g_rules_channel_id {
        embed_fields.push(
            (
                "Rules Channel",
                format!("{}", g_rules_channel_id.mention()),
                true,
            )
        );
    }

    if let Some(g_public_updates_channel_id) = g_public_updates_channel_id {
        embed_fields.push(
            (
                "Public Updates Channel",
                format!("{}", g_public_updates_channel_id.mention()),
                true,
            )
        );
    }

    if let Some(g_system_channel_id) = g_system_channel_id {
        embed_fields.push(
            (
                "System Channel",
                format!("{}", g_system_channel_id.mention()),
                true,
            )
        );
    }

    if let Some(g_widget_channel_id) = g_widget_channel_id {
        embed_fields.push(
            (
                "Widget Channel",
                format!("{}", g_widget_channel_id.mention()),
                true,
            )
        );
    }

    embed_fields.push(
        (
            "Features",
            format!("```\n{}\n```", g_features.join("\n")),
            true,
        )
    );

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Don't go wild with this server information!")
            .fields(embed_fields)
        )
    ).await?;

    return Ok(());
}
