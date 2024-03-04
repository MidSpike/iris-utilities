//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

use serenity::utils::{FormattedTimestamp,FormattedTimestampStyle};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

/// Displays information about a role.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Utility",
    )
]
pub async fn role_info(
    ctx: Context<'_>,
    #[description = "The role to display information about."] role: serenity::Role,
) -> Result<(), Error> {
    ctx.defer().await?;

    let role = role.clone();

    let r_id = role.id;
    let r_id_string = r_id.to_string();

    let r_name = &role.name;

    let r_color = role.colour.hex();

    let r_permissions =
        role.permissions
        .iter_names()
        .map(|(name, _value)| name)
        .collect::<Vec<&str>>();

    // Copied from serenity's source code.
    let discord_epoch: u64 = 1_420_070_400_000;

    // Copied from serenity's source code.
    let r_creation_timestamp =
        serenity::Timestamp::from_millis(((r_id.get() >> 22) + discord_epoch) as i64)
        .expect("Should not fail; Failed to create timestamp from role id.");
    let r_creation_timestamp_relative_format =
        FormattedTimestamp::new(r_creation_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let r_creation_timestamp_full_format =
        FormattedTimestamp::new(r_creation_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let mut embed_fields = Vec::new();

    embed_fields.push(
        (
            "Name",
            format!("```\n{}\n```", r_name),
            false,
        )
    );

    embed_fields.push(
        (
            "Snowflake",
            format!("```\n{}\n```", r_id_string),
            false,
        )
    );

    embed_fields.push(
        (
            "Created On",
            format!(
                "{} ({})",
                r_creation_timestamp_full_format,
                r_creation_timestamp_relative_format
            ),
            false,
        )
    );

    embed_fields.push(
        (
            "Display Color",
            format!("`#{}`", r_color),
            true,
        )
    );

    embed_fields.push(
        (
            "Position",
            format!("`{}`", role.position),
            true,
        )
    );

    embed_fields.push(
        (
            "Hoisted",
            format!("`{}`", role.hoist),
            true,
        )
    );

    embed_fields.push(
        (
            "Mentionable",
            format!("`{}`", role.mentionable),
            true,
        )
    );

    embed_fields.push(
        (
            "Integration",
            format!("`{}`", role.managed),
            true,
        )
    );

    embed_fields.push(
        (
            "Premium",
            format!("`{}`", role.tags.premium_subscriber),
            true,
        )
    );

    embed_fields.push(
        (
            "Purchaseable",
            format!("`{}`", role.tags.available_for_purchase),
            true,
        )
    );

    if !r_permissions.is_empty() {
        embed_fields.push(
            (
                "Permissions",
                format!("```\n{}\n```", r_permissions.join("\n")),
                false,
            )
        );
    }

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Don't go wild with this role information!")
            .fields(embed_fields)
        )
    ).await?;

    return Ok(());
}
