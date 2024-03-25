//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::bot::{fetch_my_guild_invite_url, generate_bot_invite_url};

//------------------------------------------------------------//

/// Invite this bot to another server.
#[
    poise::command(
        slash_command,
        category = "Help and Info",
    )
]
pub async fn invite(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let my_id = ctx.serenity_context().cache.current_user().id;

    let my_invite_url = generate_bot_invite_url(my_id.into());

    let my_support_server_invite = fetch_my_guild_invite_url(ctx).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Hello there!")
            .description("You can invite me to another server by using the button below!")
        )
        .components(vec![
            serenity::CreateActionRow::Buttons(vec![
                serenity::CreateButton::new_link(my_invite_url)
                .label("Invite me!"),

                serenity::CreateButton::new_link(my_support_server_invite)
                .label("Support server"),
            ])
        ])
    ).await?;

    return Ok(());
}
