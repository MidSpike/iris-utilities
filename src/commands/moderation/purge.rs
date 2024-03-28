//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::bot::create_escaped_code_block;

//------------------------------------------------------------//

const MAX_PURGE_AMOUNT: u32 = 1000;

const DISCORD_BULK_DELETE_AMOUNT: u8 = 100;

//------------------------------------------------------------//

async fn remove_messages_from_channel(
    ctx: &Context<'_>,
    channel_id: serenity::ChannelId,
    total_amount: u32,
    before_message_id: serenity::MessageId,
) -> Result<(), Error> {
    if total_amount > MAX_PURGE_AMOUNT {
        return Err("Purging more than 1000 messages at once is not allowed.".into());
    }

    // The amount of messages to purge in each batch.
    // Example:
    // Total amount: 250
    // Amount of batches: 3
    // purge_batches: [100, 100, 50]
    let purge_batches: Vec<u32> =
        (0..total_amount)
        .step_by(DISCORD_BULK_DELETE_AMOUNT as usize)
        .map(|step_amount| {
            // If this is the last batch, purge the remaining amount of messages.
            if step_amount + (DISCORD_BULK_DELETE_AMOUNT as u32) > total_amount {
                total_amount - step_amount
            } else {
                DISCORD_BULK_DELETE_AMOUNT as u32
            }
        })
        .collect();

    for expected_amount in purge_batches {
        let messages_to_purge = channel_id.messages(
            &ctx,
            serenity::GetMessages::default()
            .limit(expected_amount as u8)
            .before(before_message_id)
        ).await?;

        let message_ids: Vec<serenity::MessageId> =
            messages_to_purge
            .iter()
            .map(|message| message.id)
            .collect();

        channel_id.delete_messages(&ctx, message_ids).await?;

        // throttle our requests to avoid hitting the rate limit
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    }

    Ok(())
}

//------------------------------------------------------------//

/// Purges messages from a channel.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        user_cooldown = "10", // in seconds
        default_member_permissions = "MANAGE_MESSAGES",
        required_bot_permissions = "MANAGE_MESSAGES",
    )
]
pub async fn purge(
    ctx: Context<'_>,

    #[min = 1]
    #[max = 1000]
    #[description = "Amount of messages to remove (1-1000)"]
    amount_of_messages: u32,

    #[description = "Why this action was performed"]
    reason: Option<String>,
) -> Result<(), Error> {
    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let _guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let reason = reason.unwrap_or("A reason was not provided.".to_string());

    let reply_handle = ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                format!(
                    "{} is purging {} messages for:\n{}",
                    executing_member.user.mention(),
                    amount_of_messages,
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    let before_message_id = reply_handle.message().await?.id;

    let removal_result = remove_messages_from_channel(
        &ctx,
        ctx.channel_id(),
        amount_of_messages,
        before_message_id,
    ).await;

    if let Err(why) = removal_result {
        println!("Failed to purge messages: {:?}", why);

        reply_handle.edit(
            poise::Context::Application(ctx),
            poise::CreateReply::default()
            .embed(
                serenity::CreateEmbed::default()
                .color(0xFF0000)
                .title("Moderation")
                .description(
                    format!(
                        "{} failed to purge {} messages for:\n{}",
                        executing_member.user.mention(),
                        amount_of_messages,
                        create_escaped_code_block(None, &reason),
                    )
                )
            )
        ).await?;

        return Ok(()); // stop here
    }

    reply_handle.edit(
        poise::Context::Application(ctx),
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                format!(
                    "{} purged {} messages for:\n```{}```",
                    executing_member.user.mention(),
                    amount_of_messages,
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    Ok(())
}
