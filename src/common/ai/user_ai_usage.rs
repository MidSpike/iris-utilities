//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity, FormattedTimestamp, FormattedTimestampStyle};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::database::interfaces::user_config::UserConfig;

use crate::common::entitlements;

//------------------------------------------------------------//

/// Stored in an environment variable for now.
/// In the future, this should be dynamically determined based on the user's entitlements.
/// Returns the number of GPT tokens a user is allowed to use before being limited.
async fn get_user_gpt_token_limit(
    http: impl serenity::CacheHttp,
    discord_user_id: serenity::UserId,
) -> Result<u32, Error> {
    let is_entitled: bool = if entitlements::is_checking_enabled() {
        // TODO: Unsophisticated check for development purposes.
        entitlements::is_user_entitled_anything(&http, discord_user_id).await?
    } else {
        false
    };

    let limit: u32 = if is_entitled {
        std::env::var("USER_AI_GPT_TOKEN_LIMIT_PREMIUM")
        .expect("USER_AI_GPT_TOKEN_LIMIT_PREMIUM is not set.")
        .parse::<u32>()
        .expect("USER_AI_GPT_TOKEN_LIMIT_PREMIUM is not a valid u32.")
    } else {
        std::env::var("USER_AI_GPT_TOKEN_LIMIT_STANDARD")
        .expect("USER_AI_GPT_TOKEN_LIMIT_STANDARD is not set.")
        .parse::<u32>()
        .expect("USER_AI_GPT_TOKEN_LIMIT_STANDARD is not a valid u32.")
    };

    assert!(limit > 0, "USER_AI_GPT_TOKEN_LIMIT_<TIER> must be greater than 0.");

    Ok(limit)
}

/// Stored in an environment variable for now.
/// In the future, this should be dynamically determined based on the user's entitlements.
/// Returns the interval at which a user's GPT tokens should regenerate.
async fn get_user_gpt_token_regeneration_interval(
    http: impl serenity::CacheHttp,
    discord_user_id: serenity::UserId,
) -> Result<chrono::Duration, Error> {
    let is_entitled: bool = if entitlements::is_checking_enabled() {
        // TODO: Unsophisticated check for development purposes.
        entitlements::is_user_entitled_anything(&http, discord_user_id).await?
    } else {
        false
    };

    let interval: i32 = if is_entitled {
        std::env::var("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_PREMIUM")
        .expect("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_PREMIUM is not set.")
        .parse::<i32>()
        .expect("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_PREMIUM is not a valid i32.")
    } else {
        std::env::var("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_STANDARD")
        .expect("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_STANDARD is not set.")
        .parse::<i32>()
        .expect("USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_STANDARD is not a valid i32.")
    };

    assert!(interval > 0, "USER_AI_GPT_TOKEN_REGENERATION_INTERVAL_<TIER> must be greater than 0.");

    Ok(chrono::Duration::minutes(interval as i64))
}

//------------------------------------------------------------//

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
/// Afterwards, returns `true` if the user is above their GPT token limit.
pub async fn is_user_above_gpt_token_limit(
    http: impl serenity::CacheHttp,
    discord_user_id: serenity::UserId,
) -> Result<bool, Error> {
    let now = chrono::Utc::now();

    let gpt_token_regeneration_interval =
        get_user_gpt_token_regeneration_interval(&http, discord_user_id).await?;

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

    let gpt_token_limit = get_user_gpt_token_limit(&http, discord_user_id).await?;

    Ok(gpt_tokens_used >= gpt_token_limit)
}

pub async fn send_gpt_token_limit_exceeded_message(
    ctx: &Context<'_>,
) -> Result<(), Error> {
    let user_id = ctx.author().id;

    let gpt_token_limit = get_user_gpt_token_limit(&ctx, user_id).await?;

    let gpt_tokens_used = get_user_gpt_tokens_used(user_id).await?;

    let relative_regeneration_timestamp = {
        let gpt_token_regeneration_interval =
            get_user_gpt_token_regeneration_interval(&ctx, user_id).await?;

        let gpt_tokens_used_last_regeneration =
            get_user_gpt_tokens_used_last_regeneration(user_id).await?;

        let next_regeneration =
            gpt_tokens_used_last_regeneration + gpt_token_regeneration_interval;

        let timestamp = serenity::Timestamp::from_unix_timestamp(next_regeneration.timestamp())?;

        FormattedTimestamp::new(timestamp, Some(FormattedTimestampStyle::RelativeTime))
    };

    let application = ctx.http().get_current_application_info().await?;

    let message = if entitlements::is_checking_enabled() {
        indoc::formatdoc!(
            r#"
                It looks like you exceeded your limit of **{gpt_token_limit}** GPT tokens.
                So far you have used **{gpt_tokens_used}** GPT tokens since the last regeneration.

                Don't worry, your GPT tokens will regenerate in {relative_timestamp}.
                Simply touch grass and come back later, I know you can do it!
                Or, if you're impatient, you can upgrade yourself.

                **Want to regenerate GPT tokens a lot faster?**
                - Upgrade yourself with **{upgrade_name}**.
            "#,
            gpt_token_limit = gpt_token_limit,
            gpt_tokens_used = gpt_tokens_used,
            relative_timestamp = relative_regeneration_timestamp,
            upgrade_name = format!("{} Premium", application.name), // @TODO: Get the actual name of the premium SKU.
        )
    } else {
        indoc::formatdoc!(
            r#"
                It looks like you exceeded your limit of **{gpt_token_limit}** GPT tokens.
                So far you have used **{gpt_tokens_used}** GPT tokens since the last regeneration.

                Don't worry, your GPT tokens will regenerate in {relative_timestamp}.
                Simply touch grass and come back later, I know you can do it!
            "#,
            gpt_token_limit = gpt_token_limit,
            gpt_tokens_used = gpt_tokens_used,
            relative_timestamp = relative_regeneration_timestamp,
        )
    };

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("This action requires more GPT tokens.")
            .description(message)
        )
    ).await?;

    Ok(())
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
