//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

use serenity::utils::{FormattedTimestamp,FormattedTimestampStyle};

//------------------------------------------------------------//

use crate::Error;

use crate::Context;

use crate::common::brand::BrandColor;

use crate::common::database::interfaces::user_config::UserConfig;

//------------------------------------------------------------//

/// Hardcoded for now.
/// In the future, this should be dynamically determined based on the user's entitlements.
/// Returns the number of GPT tokens a user is allowed to use before being limited.
async fn get_user_gpt_token_limit(
    _discord_user_id: serenity::UserId,
) -> Result<u32, Error> {
    Ok(1000)
}

/// Hardcoded for now.
/// In the future, this should be dynamically determined based on the user's entitlements.
/// Returns the interval at which a user's GPT tokens should regenerate.
async fn get_user_gpt_token_regeneration_interval(
    _discord_user_id: serenity::UserId,
) -> Result<chrono::Duration, Error> {
    Ok(chrono::Duration::hours(1))
}

async fn get_user_gpt_tokens_used(
    discord_user_id: serenity::UserId,
) -> Result<u32, Error> {
    let user_id = discord_user_id.get().to_string();

    let user_config = UserConfig::ensure(user_id).await?;

    let gpt_tokens_used = user_config.get_gpt_tokens_used().await;

    Ok(gpt_tokens_used)
}

async fn get_user_gpt_tokens_used_last_regeneration(
    discord_user_id: serenity::UserId,
) -> Result<chrono::DateTime<chrono::Utc>, Error> {
    let user_id = discord_user_id.get().to_string();

    let user_config = UserConfig::ensure(user_id).await?;

    let gpt_tokens_last_regeneration = user_config.get_gpt_tokens_used_last_regeneration().await;

    Ok(gpt_tokens_last_regeneration)
}

//------------------------------------------------------------//

/// If the user is due for a token regeneration, their token usage will be reset.
/// Afterwards, returns true if the user is above their GPT token limit.
pub async fn is_user_above_gpt_token_limit(
    discord_user_id: serenity::UserId,
) -> Result<bool, Error> {
    let now = chrono::Utc::now();

    let gpt_token_regeneration_interval =
        get_user_gpt_token_regeneration_interval(discord_user_id).await?;

    let gpt_tokens_used_last_regeneration =
        get_user_gpt_tokens_used_last_regeneration(discord_user_id).await?;

    let next_regeneration =
        gpt_tokens_used_last_regeneration + gpt_token_regeneration_interval;

    if now > next_regeneration {
        let user_id = discord_user_id.get().to_string();

        let user_config = UserConfig::ensure(user_id).await?;

        user_config.reset_gpt_tokens_used().await?;
    }

    let gpt_tokens_used = get_user_gpt_tokens_used(discord_user_id).await?;

    let gpt_token_limit = get_user_gpt_token_limit(discord_user_id).await?;

    Ok(gpt_tokens_used >= gpt_token_limit)
}

pub async fn increment_user_gpt_tokens(
    discord_user_id: serenity::UserId,
    increment_by: u32,
) -> Result<(), Error> {
    let user_id = discord_user_id.get().to_string();

    let user_config = UserConfig::ensure(user_id).await?;

    user_config.increment_gpt_tokens_used(increment_by).await?;

    Ok(())
}

pub async fn send_gpt_token_limit_exceeded_message(
    ctx: &Context<'_>,
) -> Result<(), Error> {
    let user_id = ctx.author().id;

    let gpt_token_limit = get_user_gpt_token_limit(user_id).await?;

    let gpt_tokens_used = get_user_gpt_tokens_used(user_id).await?;

    let formatted_regeneration_timestamp = {
        let gpt_token_regeneration_interval =
            get_user_gpt_token_regeneration_interval(user_id).await?;

        let gpt_tokens_used_last_regeneration =
            get_user_gpt_tokens_used_last_regeneration(user_id).await?;

        let next_regeneration =
            gpt_tokens_used_last_regeneration + gpt_token_regeneration_interval;

        let timestamp = serenity::Timestamp::from_unix_timestamp(next_regeneration.timestamp())?;

        FormattedTimestamp::new(timestamp, Some(FormattedTimestampStyle::RelativeTime))
    };

    let message = indoc::formatdoc!(
        r#"
            It looks like you exceeded your limit of **{gpt_token_limit}** GPT tokens.
            So far you have used **{gpt_tokens_used}** GPT tokens since the last regeneration.

            Don't worry, your GPT tokens will regenerate in {formatted_regeneration_timestamp}.
            Simply touch grass and come back later, I know you can do it!
            Or if you're impatient, you can upgrade yourself or a server you own.

            **Do you want to use more GPT tokens for yourself?**
            - Upgrade yourself with {user_entitlement_name}.

            **Are you a sever owner that wants your members to have more GPT tokens?**
            - Upgrade your server with {guild_entitlement_name}.
        "#,
        gpt_token_limit = gpt_token_limit,
        gpt_tokens_used = gpt_tokens_used,
        formatted_regeneration_timestamp = formatted_regeneration_timestamp,
        user_entitlement_name = "USER_ENTITLEMENT_PLACEHOLDER",
        guild_entitlement_name = "GUILD_ENTITLEMENT_PLACEHOLDER",
    );

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("This action requires more GPT tokens.")
            .description(message)
        )
    ).await?;

    Ok(())
}
