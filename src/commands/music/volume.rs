//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use lavalink_rs::player_context::PlayerContext;

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::music;

//------------------------------------------------------------//

fn create_volume_embed(
    user: &serenity::User,
    old_volume: music::Volume,
    new_volume: Option<music::Volume>,
) -> serenity::CreateEmbed {
    let old_normal_volume = old_volume.get_normal_volume();
    let new_normal_volume = new_volume.map(|v| v.get_normal_volume());

    match new_normal_volume {
        Some(new_normal_volume) => {
            let description = if new_normal_volume > old_normal_volume {
                format!(
                    "{}, increased volume from {}% to {}%",
                    user.mention(),
                    old_normal_volume,
                    new_normal_volume
                )
            } else if new_normal_volume < old_normal_volume {
                format!(
                    "{}, decreased volume to {}% from {}%",
                    user.mention(),
                    new_normal_volume,
                    old_normal_volume
                )
            } else {
                format!(
                    "{}, maintained volume of {}%",
                    user.mention(),
                    old_normal_volume
                )
            };

            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .description(description)
        },
        None => {
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .description(format!("The current volume is {}%", old_volume.get_normal_volume()))
        },
    }
}

//------------------------------------------------------------//

async fn get_current_volume(
    player_context: &PlayerContext,
) -> Result<music::Volume, Error> {
    let player = match player_context.get_player().await {
        Ok(player) => player,
        Err(why) => {
            eprintln!("Failed to get player: {:?}", why);

            return Err("Failed to get player".into());
        }
    };

    Ok(music::Volume::from_lavalink_volume(player.volume))
}

async fn set_new_volume(
    player_context: &PlayerContext,
    new_volume: &music::Volume,
) -> Result<(), Error> {
    player_context.set_volume(new_volume.get_lavalink_volume()).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Set the volume of the player.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
    )
]
pub async fn volume(
    ctx: Context<'_>,
    #[description = "The volume to set the player to (0-100)"] volume: Option<u16>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let guild_id = ctx.guild_id().expect("This command can only be used in a guild.");

    let lava_client = ctx.data().lavalink.clone();

    let Some(player_context) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    let current_volume = get_current_volume(&player_context).await?;

    let new_volume = match volume {
        Some(volume) => {
            let volume = music::Volume::from_normal_volume(volume);

            player_context.set_volume(volume.get_lavalink_volume()).await?;

            Some(volume)
        },
        None => None,
    };

    let mute_button_id = format!("{}-mute", ctx.id());
    let decrease_volume_button_id = format!("{}-decrease-volume", ctx.id());
    let increase_volume_button_id = format!("{}-increase-volume", ctx.id());

    let mute_button =
        serenity::CreateButton::new(&mute_button_id)
        .style(serenity::ButtonStyle::Secondary)
        .label("Mute");

    let decrease_volume_button =
        serenity::CreateButton::new(&decrease_volume_button_id)
        .style(serenity::ButtonStyle::Secondary)
        .label("Decrease Volume");

    let increase_volume_button =
        serenity::CreateButton::new(&increase_volume_button_id)
        .style(serenity::ButtonStyle::Secondary)
        .label("Increase Volume");

    let reply_handle = ctx.send(
        poise::CreateReply::default()
        .embed(create_volume_embed(ctx.author(), current_volume, new_volume))
        .components(vec![
            serenity::CreateActionRow::Buttons(vec![
                mute_button.clone(),
                decrease_volume_button.clone(),
                increase_volume_button.clone(),
            ])
        ])
    ).await?;

    let message = reply_handle.message().await?;

    while let Some(component_interaction) =
        message
        .await_component_interactions(ctx)
        .author_id(ctx.author().id)
        .timeout(std::time::Duration::from_secs(2 * 60))
        .await
    {
        // Defer while we process the interaction.
        component_interaction.defer(ctx).await?;

        let component_interaction_id = component_interaction.data.custom_id.clone();

        let is_mute_button = component_interaction_id == mute_button_id;
        let is_decrease_volume_button = component_interaction_id == decrease_volume_button_id;
        let is_increase_volume_button = component_interaction_id == increase_volume_button_id;

        let current_volume = get_current_volume(&player_context).await?;

        let current_normal_volume = current_volume.get_normal_volume();
        let new_normal_volume = if is_mute_button {
            0
        } else if is_decrease_volume_button {
            current_normal_volume - 10
        } else if is_increase_volume_button {
            current_normal_volume + 10
        } else {
            continue; // Continue loop on unknown buttons.
        };

        let new_volume = music::Volume::from_normal_volume(new_normal_volume);

        set_new_volume(&player_context, &new_volume).await?;

        let edit_reply =
            serenity::EditInteractionResponse::default()
            .embed(
                create_volume_embed(
                    &component_interaction.user,
                    current_volume,
                    Some(new_volume)
                )
            );

        component_interaction.edit_response(ctx, edit_reply).await?;
    }

    // After the loop, delete the message to clean up.
    // This prevents stale components from being left behind.
    reply_handle.delete(poise::Context::Application(ctx)).await?;

    Ok(())
}
