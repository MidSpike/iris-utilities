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

/// Displays information about a channel.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Utility",
    )
]
pub async fn channel_info(
    ctx: Context<'_>,
    #[description = "The channel to display information about."] channel: serenity::GuildChannel,
) -> Result<(), Error> {
    ctx.defer().await?;

    let channel = channel.clone();

    let c_id = channel.id;
    let c_id_string = c_id.to_string();

    let c_name = &channel.name;

    let c_topic = &channel.topic;

    let c_type = &channel.kind;

    let c_parent_id = &channel.parent_id;

    let c_position = &channel.position;

    let c_nsfw = channel.is_nsfw();

    let c_flags =
        channel.flags
        .iter_names()
        .map(|(name, _value)| name)
        .collect::<Vec<&str>>();

    // Copied from serenity's source code.
    let discord_epoch: u64 = 1_420_070_400_000;

    // Copied from serenity's source code.
    let c_creation_timestamp =
        serenity::Timestamp::from_millis(((c_id.get() >> 22) + discord_epoch) as i64)
        .expect("Should not fail; Failed to create timestamp from channel id.");
    let c_creation_timestamp_relative_format =
        FormattedTimestamp::new(c_creation_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let c_creation_timestamp_full_format =
        FormattedTimestamp::new(c_creation_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let mut embed_fields = Vec::new();

    embed_fields.push(
        (
            "Name",
            format!("```\n{}\n```", c_name),
            false,
        )
    );

    embed_fields.push(
        (
            "Snowflake",
            format!("```\n{}\n```", c_id_string),
            false,
        )
    );

    if let Some(c_topic) = c_topic {
        embed_fields.push(
            (
                "Topic",
                format!("```\n{}\n```", c_topic),
                false,
            )
        );
    }

    embed_fields.push(
        (
            "Created On",
            format!(
                "{} ({})",
                c_creation_timestamp_full_format,
                c_creation_timestamp_relative_format
            ),
            false,
        )
    );

    embed_fields.push(
        (
            "Type",
            format!("`{}`", c_type.name()),
            true,
        )
    );

    embed_fields.push(
        (
            "Position",
            format!("`{}`", c_position),
            true,
        )
    );

    if let Some(c_parent_id) = c_parent_id {
        embed_fields.push(
            (
                "Parent",
                format!("{}", c_parent_id.mention()),
                true,
            )
        );
    }

    embed_fields.push(
        (
            "NSFW",
            format!("`{}`", c_nsfw),
            true,
        )
    );

    if !c_flags.is_empty() {
        embed_fields.push(
            (
                "Flags",
                format!("```\n{}\n```", c_flags.join("\n")),
                false,
            )
        );
    }

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Don't go wild with this channel information!")
            .fields(embed_fields)
        )
    ).await?;

    return Ok(());
}
