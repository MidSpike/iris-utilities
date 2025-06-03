//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

struct HelpPage {
    title: String,
    contents: String,
}

//------------------------------------------------------------//

fn get_help_pages(
    ctx: &Context<'_>,
) -> Vec<HelpPage> {
    ctx.framework().options().commands
    .iter()
    .filter(
        |command| command.slash_action.is_some()
    )
    .chunk_by(
        |command| command.category.clone().unwrap_or("Unknown Category".into())
    )
    .into_iter()
    .sorted_by(
        |a, b| {
            // Force the hoisted category to be first and sort the rest alphabetically.

            let hoisted_category_name = "Help and Info"; // hard-coded, but good enough

            if a.0 == hoisted_category_name {
                std::cmp::Ordering::Less
            } else if b.0 == hoisted_category_name {
                std::cmp::Ordering::Greater
            } else {
                a.0.cmp(&b.0)
            }
        }
    )
    .map(
        |(category_name, commands)| {
            let help_page_title = format!("{} Commands", category_name);
            let help_page_contents = commands.map(
                |command| format!(
                    "`/{}` - {}",
                    command.name,
                    command.description.clone().unwrap_or("No description provided".into())
                )
            ).join("\n");

            HelpPage {
                title: help_page_title,
                contents: help_page_contents,
            }
        }
    )
    .collect()
}

//------------------------------------------------------------//

fn create_help_page_embed(
    help_page: &HelpPage,
    help_page_index: usize,
    num_help_pages: usize,
) -> serenity::CreateEmbed {
    let current_page_number = help_page_index + 1;

    serenity::CreateEmbed::default()
    .color(BrandColor::new().get())
    .title(format!("{} ({} / {})", help_page.title, current_page_number, num_help_pages))
    .description(&help_page.contents)
}

//------------------------------------------------------------//

/// See all available commands.
#[
    poise::command(
        slash_command,
        category = "Help and Info",
    )
]
pub async fn help(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let previous_page_button_id = format!("{}-previous-button", ctx.id());
    let next_page_button_id = format!("{}-next-button", ctx.id());

    let help_pages = get_help_pages(&ctx);
    let mut help_page_index = 0;

    let initial_help_page = help_pages.get(help_page_index).expect("Help pages are empty");

    let reply_handle = ctx.send(
        poise::CreateReply::default()
        .embed(
            create_help_page_embed(
                &initial_help_page,
                help_page_index,
                help_pages.len(),
            )
        )
        .components(vec![
            serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new(&previous_page_button_id)
                .style(serenity::ButtonStyle::Secondary)
                .label("Previous Page"),

                serenity::CreateButton::new(&next_page_button_id)
                .style(serenity::ButtonStyle::Secondary)
                .label("Next Page"),
            ])
        ])
    ).await?;

    let message = reply_handle.message().await?;

    while let Some(component_interaction) =
        message
        .await_component_interactions(ctx)
        .author_id(ctx.author().id)
        .timeout(std::time::Duration::from_secs(5 * 60))
        .await
    {
        // Defer while we process the interaction.
        component_interaction.defer(ctx).await?;

        let component_interaction_id = component_interaction.data.custom_id.clone();

        match component_interaction_id {
            id if id == previous_page_button_id => {
                help_page_index =
                    if help_page_index == 0 { help_pages.len() - 1 } // skip to end
                    else { help_page_index - 1 }; // previous page
            },
            id if id == next_page_button_id => {
                help_page_index =
                    if help_page_index == help_pages.len() - 1 { 0 } // skip to start
                    else { help_page_index + 1 }; // next page
            },
            _ => {}, // Ignore unknown button ids
        }

        let help_page = &help_pages.get(help_page_index).unwrap();

        // Edit response since we deferred earlier.
        component_interaction.edit_response(
            &ctx,
            serenity::EditInteractionResponse::default().embed(
                create_help_page_embed(
                    &help_page,
                    help_page_index,
                    help_pages.len(),
                )
            )
        ).await?;
    }

    // After the loop, delete the message to clean up.
    // This prevents stale components from being left behind.
    reply_handle.delete(poise::Context::Application(ctx)).await?;

    return Ok(());
}
