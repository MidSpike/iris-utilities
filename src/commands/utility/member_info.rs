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

async fn create_member_info_embed(
    ctx: Context<'_>,
    member: &serenity::Member,
) -> serenity::CreateEmbed {
    let member = member.clone();

    let u_id = member.user.id;
    let u_id_string = u_id.to_string();

    let u_username = &member.user.name;

    let u_avatar_url = member.user.face();

    let u_flags =
        member.user.flags
        .iter_names()
        .map(|(name, _value)| name)
        .collect::<Vec<&str>>();

    let u_creation_timestamp = member.user.created_at();
    let u_creation_timestamp_relative_format =
        FormattedTimestamp::new(u_creation_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let u_creation_timestamp_full_format =
        FormattedTimestamp::new(u_creation_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let m_nickname = &member.nick;

    let m_avatar_url = member.face();

    let m_color = member.colour(ctx).map(|color| color.hex());

    let m_join_timestamp = member.joined_at.expect("Member joined_at timestamp not found");
    let m_join_timestamp_relative_format =
        FormattedTimestamp::new(m_join_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let m_join_timestamp_full_format =
        FormattedTimestamp::new(m_join_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let mut embed_fields = Vec::new();

    embed_fields.push(
        (
            "Username",
            format!("```\n{}\n```", u_username),
            false,
        )
    );

    if let Some(m_nickname) = m_nickname {
        embed_fields.push(
            (
                "Nickname",
                format!("```\n{}\n```", m_nickname),
                false,
            )
        );
    }

    embed_fields.push(
        (
            "Snowflake",
            format!("```\n{}\n```", u_id_string),
            false,
        )
    );

    embed_fields.push(
        (
            "Account Created On",
            format!(
                "{} ({})",
                u_creation_timestamp_full_format,
                u_creation_timestamp_relative_format
            ),
            false,
        )
    );

    embed_fields.push(
        (
            "Joined Guild On",
            format!("{} ({})", m_join_timestamp_full_format, m_join_timestamp_relative_format),
            false,
        )
    );

    embed_fields.push(
        (
            "System",
            format!("`{}`", member.user.system),
            true,
        )
    );

    embed_fields.push(
        (
            "Bot",
            format!("`{}`", member.user.bot),
            true,
        )
    );

    if let Some(m_color) = m_color {
        embed_fields.push(
            (
                "Display Color",
                format!("`#{}`", m_color),
                true,
            )
        );
    }

    embed_fields.push(
        (
            "User Avatar",
            format!("[view]({})", u_avatar_url),
            true,
        )
    );

    embed_fields.push(
        (
            "Member Avatar",
            format!("[view]({})", m_avatar_url),
            true,
        )
    );

    if !u_flags.is_empty() {
        embed_fields.push(
            (
                "Flags",
                format!("```\n{}\n```", u_flags.join("\n")),
                false,
            )
        );
    }

    serenity::CreateEmbed::default()
    .color(BrandColor::new().get())
    .title("Don't go wild with this member information!")
    .fields(embed_fields)
}

//------------------------------------------------------------//

/// Displays information about a member.
#[
    poise::command(
        context_menu_command = "Guild Member Info",
        guild_only,
        category = "Context Commands",
    )
]
pub async fn member_info_user_context_menu(
    ctx: Context<'_>,

    #[description = "The member to display information about."]
    user: serenity::User,
) -> Result<(), Error> {
    ctx.defer_ephemeral().await?;

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let member =
        guild
        .member(&ctx, user.id).await
        .expect("Somehow, this user might not be a member of this guild.")
        .clone();

    let embed = create_member_info_embed(ctx, &member).await;

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    return Ok(());
}

//------------------------------------------------------------//

/// Displays information about a member.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Utility",
    )
]
pub async fn member_info(
    ctx: Context<'_>,

    #[description = "The member to display information about."]
    member: serenity::Member,
) -> Result<(), Error> {
    ctx.defer().await?;

    let embed = create_member_info_embed(ctx, &member).await;

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    return Ok(());
}
