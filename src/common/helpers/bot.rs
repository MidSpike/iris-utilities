//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{CacheHttp, ComponentInteractionCollector, Invite};
use poise::serenity_prelude::{self as serenity, CreateInvite};
use serenity::futures::stream::StreamExt;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

//------------------------------------------------------------//

pub fn create_default_allowed_mentions<'a>() -> serenity::CreateAllowedMentions<'a> {
    serenity::CreateAllowedMentions::default()
    .replied_user(true)
    .all_users(false)
    .all_roles(false)
    .everyone(false)
}

//------------------------------------------------------------//

pub fn create_escaped_code_block(
    language: Option<&str>,
    content: &str,
) -> String {
    // Replace all triple backticks with zero width space joined triple backticks.
    // This prevents the code block from being parsed by Discord.
    let content = content.replace("```", "`\u{200B}`\u{200B}`");

    // Default to an empty string if no language is provided.
    // This will result in a plain text code block.
    let language = language.unwrap_or("");

    format!("```{}\n{}```", language, content)
}

//------------------------------------------------------------//

pub fn generate_bot_invite_url(
    bot_id: u64,
) -> String {
    let scopes = [
        serenity::Scope::Bot,
        serenity::Scope::ApplicationsCommands,
    ]
    .iter()
    .map(|scope| scope.to_string())
    .collect::<Vec<String>>()
    .join("+");

    let permissions = serenity::Permissions::ADMINISTRATOR.bits();

    format!(
        "https://discord.com/oauth2/authorize?client_id={}&scope={}&permissions={}",
        bot_id,
        scopes,
        permissions
    )
}

//------------------------------------------------------------//

async fn create_guild_invite(
    ctx: Context<'_>,
    guild_id: serenity::GuildId,
    temporary: bool,
) -> Result<Option<serenity::Invite>, Error> {
    // use http to work across shards
    let guild =
        ctx
        .http()
        .get_guild(guild_id)
        .await?;

    let guild_channels = guild.id.channels(&ctx.http()).await?;

    let invite = match guild_channels.iter().next() {
        Some(first_channel) => Some(
            Invite::create(
                &ctx.http(),
                first_channel.id,
                CreateInvite::default().temporary(temporary),
            ).await?
        ),
        None => None,
    };

    Ok(invite)
}

pub async fn fetch_my_guild_invite_url(
    ctx: Context<'_>,
) -> Result<String, Error> {
    let fallback_invite_url = String::from("https://support.discord.com/");

    let me = ctx.serenity_context().http.get_current_application_info().await?;

    let Some(guild_id) = me.guild_id else {
        eprintln!(
            "fetch_my_guild_invite():\
            \nSupport guild id not found for this bot, defaulting to 'support.discord.com'.\
            \nConsider verifying this bot and configuring a support server for it."
        );

        return Ok(fallback_invite_url);
    };

    let guild_invites =
        ctx
        .serenity_context()
        .http
        .get_guild_invites(guild_id)
        .await?;

    let potential_permanent_guild_invite = guild_invites.into_iter().find(|g| g.expires_at.is_none());

    let guild_invite = match potential_permanent_guild_invite {
        Some(invite) => Some(invite),
        None => create_guild_invite(ctx, guild_id, false).await?,
    };

    match guild_invite {
        Some(invite) => Ok(invite.url()),
        None => Ok(fallback_invite_url),
    }
}

//------------------------------------------------------------//

pub async fn simple_confirmation_embed(
    ctx: &Context<'_>,
    question: &str,
) -> Result<bool, Error> {
    let yes_button_id = format!("{}-yes", ctx.id());
    let no_button_id = format!("{}-no", ctx.id());

    let yes_button =
        serenity::CreateButton::new(&yes_button_id)
        .style(serenity::ButtonStyle::Success)
        .label("Yes");

    let no_button =
        serenity::CreateButton::new(&no_button_id)
        .style(serenity::ButtonStyle::Danger)
        .label("No");

    let create_reply =
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .description(question)
        )
        .components(vec![
            serenity::CreateComponent::ActionRow(
                serenity::CreateActionRow::buttons(vec![
                    yes_button.clone(),
                    no_button.clone(),
                ])
            )
        ]);

    let reply_handle = ctx.send(create_reply).await?;

    let message = reply_handle.message().await?;

    let mut component_interaction_collector =
        ComponentInteractionCollector::new(&ctx.serenity_context())
        .author_id(ctx.author().id)
        .message_id(message.id)
        .timeout(std::time::Duration::from_secs(5 * 60))
        .stream();

    while let Some(component_interaction) = component_interaction_collector.next().await {
        // Defer while we process the interaction.
        component_interaction.defer(&ctx.http()).await?;

        let is_yes_button = component_interaction.data.custom_id == yes_button_id;
        let is_no_button = component_interaction.data.custom_id == no_button_id;

        let disabled_yes_button =
            yes_button
            .style(
                if is_yes_button { serenity::ButtonStyle::Success }
                else { serenity::ButtonStyle::Secondary }
            )
            .disabled(true);

        let disabled_no_button =
            no_button
            .style(
                if is_no_button { serenity::ButtonStyle::Danger }
                else { serenity::ButtonStyle::Secondary }
            )
            .disabled(true);

        let edit_reply =
            serenity::EditInteractionResponse::default()
            .components(vec![
                serenity::CreateComponent::ActionRow(
                    serenity::CreateActionRow::buttons(vec![
                        disabled_yes_button,
                        disabled_no_button,
                    ])
                )
            ]);

        component_interaction.edit_response(&ctx.http(), edit_reply).await?;

        return Ok(is_yes_button);
    }

    Ok(false)
}

/// Creates a confirmation dialog for potentially nsfw content.\
/// Intended to be used when executed inside of non-nsfw channels.
///
/// This should only be reserved for content that MAY CONTAIN SOME nsfw content.\
/// This should NOT be used for content that WILL or MOSTLY CONTAINS nsfw content.
pub async fn potential_nsfw_confirmation(
    ctx: &Context<'_>,
) -> Result<bool, Error> {

    simple_confirmation_embed(
        &ctx,
        indoc::formatdoc!(
            r#"
            # Third-Party Content Warning

            Fetched content may not be suitable for all age demographics.
            Most content is expected to be safe-for-work, but some may not be.

            Do you wish to proceed?
            "#,
        ).as_str()
    ).await
}
