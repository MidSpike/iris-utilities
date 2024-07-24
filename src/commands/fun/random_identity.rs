//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::Timestamp;
use poise::serenity_prelude::{self as serenity};

use serenity::utils::{FormattedTimestamp,FormattedTimestampStyle};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityName {
    pub title: String,
    pub first: String,
    pub last: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityStreet {
    pub number: i64,
    pub name: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityCoordinates {
    pub latitude: String,
    pub longitude: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityTimezone {
    pub offset: String,
    pub description: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityLocation {
    pub street: RandomIdentityStreet,
    pub city: String,
    pub state: String,
    pub country: String,
    pub postcode: i64,
    pub coordinates: RandomIdentityCoordinates,
    pub timezone: RandomIdentityTimezone,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityLogin {
    pub uuid: String,
    pub username: String,
    pub password: String,
    pub salt: String,
    pub md5: String,
    pub sha1: String,
    pub sha256: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityDateOfBirth {
    pub date: String,
    pub age: i64,
}

impl RandomIdentityDateOfBirth {
    pub fn get_discord_timestamp(
        &self,
        style: FormattedTimestampStyle,
    ) -> Result<FormattedTimestamp, Error> {
        let epoch: i64 = Timestamp::parse(self.date.as_str())?.timestamp();

        Ok(FormattedTimestamp::new(Timestamp::from_millis(epoch)?, Some(style)))
    }
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityRegistered {
    pub date: String,
    pub age: i64,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityId {
    pub name: String,
    pub value: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityPicture {
    #[serde(rename = "large")]
    pub large_url: String,
    #[serde(rename = "medium")]
    pub medium_url: String,
    #[serde(rename = "thumbnail")]
    pub thumbnail_url: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityInfo {
    pub seed: String,
    pub results: i64,
    pub page: i64,
    pub version: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityResult {
    pub id: RandomIdentityId,
    pub name: RandomIdentityName,
    pub gender: String,
    #[serde(rename = "dob")]
    pub date_of_birth: RandomIdentityDateOfBirth,
    #[serde(rename = "nat")]
    pub nationality: String,
    pub registered: RandomIdentityRegistered,
    pub email: String,
    pub login: RandomIdentityLogin,
    pub location: RandomIdentityLocation,
    pub picture: RandomIdentityPicture,
    #[serde(rename = "phone")]
    pub phone_home: String,
    #[serde(rename = "cell")]
    pub phone_mobile: String,
}

#[derive(Default, Debug, Clone, PartialEq, Serialize, Deserialize)]
struct RandomIdentityApiResponse {
    pub results: Vec<RandomIdentityResult>,
    pub info: RandomIdentityInfo,
}

//------------------------------------------------------------//

async fn fetch_random_identity() -> Result<RandomIdentityResult, Error> {
    let response = reqwest::get("https://randomuser.me/api/").await?;

    let json: RandomIdentityApiResponse = response.json().await?;

    let first_result = json.results.get(0).expect("No results for random identity.");

    Ok(first_result.clone())
}

//------------------------------------------------------------//

/// Generates a random fake identity.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn random_identity(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let fake_identity = fetch_random_identity().await?;

    let name = format!(
        "{} {} {}",
        fake_identity.name.title,
        fake_identity.name.first,
        fake_identity.name.last,
    );

    let location = format!(
        "{}, {}, {}, {}, {}",
        format!("{} {}", fake_identity.location.street.number, fake_identity.location.street.name),
        fake_identity.location.postcode,
        fake_identity.location.city,
        fake_identity.location.state,
        fake_identity.location.country,
    );

    let date_of_birth = format!(
        "{} ({})",
        fake_identity.date_of_birth.get_discord_timestamp(FormattedTimestampStyle::ShortDate)?,
        fake_identity.date_of_birth.get_discord_timestamp(FormattedTimestampStyle::RelativeTime)?,
    );

    let embed_fields = vec![
        ("Name", name, true),
        ("Date of Birth", date_of_birth, true),
        ("Location", location, false),
        ("Email", fake_identity.email, true),
        ("Username", fake_identity.login.username, true),
        ("Password", fake_identity.login.password, true),
        ("Phone (Home)", fake_identity.phone_home, true),
        ("Phone (Mobile)", fake_identity.phone_mobile, true),
    ];

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("Here's a random fake identity."))
            .thumbnail(fake_identity.picture.large_url)
            .fields(embed_fields)
            .footer(serenity::CreateEmbedFooter::new("Generated by https://randomuser.me/"))
        )
    ).await?;

    Ok(())
}
