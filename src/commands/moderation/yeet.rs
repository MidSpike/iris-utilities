//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::collections::HashMap;

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::moderation;

use crate::common::helpers::bot::create_escaped_code_block;

//------------------------------------------------------------//

// for member in members {
//     // wait a bit to avoid discord rate limits
//     tokio::time::sleep(std::time::Duration::from_millis(100)).await;
// }

fn find_suitable_voice_channel(
    ctx: &Context<'_>,
    _guild: &serenity::Guild, // will be used later
    _member: &serenity::Member, // will be used later
    current_voice_channel: serenity::Channel,
) -> Result<Option<serenity::ChannelId>, Error> {
    let guild_channel =
        current_voice_channel
        .guild()
        .expect("There should be a guild channel in this context.");

    let guild =
        guild_channel
        .guild(&ctx)
        .expect("There should be a guild in this context.");

    let afk_metadata = guild.afk_metadata.clone();

    Ok(afk_metadata.map(|meta| meta.afk_channel_id))
}

async fn relocate_member_in_voice_channel(
    ctx: &Context<'_>,
    member: &mut serenity::Member,
    target_voice_channel_id: serenity::ChannelId,
    audit_log_reason: &str,
) -> Result<(), Error> {
    member.edit(
        &ctx,
        serenity::EditMember::default()
        .voice_channel(target_voice_channel_id)
        .audit_log_reason(audit_log_reason)
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Yeets a user from their voice channel.
#[poise::command(slash_command)]
pub async fn someone(
    ctx: Context<'_>,
    #[description = "The member to yeet"] member: serenity::Member,
    #[description = "Why this action was performed"] reason: Option<String>,
) -> Result<(), Error> {
    let mut target_member = member; // renamed to avoid confusion

    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let my_id = ctx.serenity_context().cache.current_user().id;

    let my_guild_member =
        guild
        .member(&ctx, my_id).await
        .expect("I should be in this guild.")
        .clone();

    // check if executing member has discord permission to perform this action at all
    moderation::assert_guild_member_permitted_by_discord(
        &ctx,
        |_guild, _executing_member, permissions| {
            permissions.move_members()
        },
        "You do not have permission to perform this action.",
    ).await?;

    // check if executing member is above target member in the role hierarchy
    moderation::assert_member_above_other_member(
        &ctx,
        &executing_member,
        &target_member,
        "You cannot perform an action on a member that has an equal or higher role than you.",
    ).await?;

    // check if this bot is above target member in the role hierarchy
    moderation::assert_member_above_other_member(
        &ctx,
        &my_guild_member,
        &target_member,
        "I cannot perform an action on a member that has an equal or higher role than me.",
    ).await?;

    let reason = reason.unwrap_or("A reason was not provided.".to_string());

    let mut guild_voice_states = HashMap::new();
    if let Some(guild) = ctx.cache().guild(guild.id) {
        guild_voice_states = guild.voice_states.clone();
    }

    let target_member_voice_channel_id_option =
        guild_voice_states
        .get(&ctx.author().id)
        .and_then(|voice_state| voice_state.channel_id);

    let Some(target_member_voice_channel_id) = target_member_voice_channel_id_option else {
        ctx.say("The specified member is not in a voice channel.").await?;

        return Ok(());
    };

    let target_member_voice_channel =
        target_member_voice_channel_id
        .to_channel(&ctx)
        .await
        .expect("There should be a voice channel in this context.");

    let suitable_voice_channel_option =
        find_suitable_voice_channel(&ctx, &guild, &target_member, target_member_voice_channel)?;

    let Some(suitable_voice_channel) = suitable_voice_channel_option else {
        ctx.say("Could not find a suitable voice channel to move the specified member to.").await?;

        return Ok(());
    };

    target_member.user.dm(
        &ctx,
        serenity::CreateMessage::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("{} - Moderation", guild.name))
            .description(
                format!(
                    "You were yeeted in {} by {} for:\n```{}```",
                    guild.name,
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await.ok(); // ignore errors

    relocate_member_in_voice_channel(
        &ctx,
        &mut target_member,
        suitable_voice_channel,
        &format!("Yeeted by {} for: {}", executing_member.user.mention(), reason),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                format!(
                    "{} was yeeted by {} for:\n```{}```",
                    target_member.user.mention(),
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

#[
    poise::command(
        slash_command,
        guild_only,
        subcommands("someone"),
        category = "Moderation",
    )
]
pub async fn yeet(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
