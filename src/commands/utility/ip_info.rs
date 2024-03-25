//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

// documentation: https://ip-api.com/docs/api:json

const API_URL: &str = "http://ip-api.com/json";

const API_FIELDS_PARAMETER: &str = "66846719";

//------------------------------------------------------------//

/// 200 OK from `API_URL`
#[derive(Serialize, Deserialize, Default, Debug)]
struct ApiResponse {
    #[serde(default = "default_string_value")]
    continent: String,
    #[serde(default = "default_string_value", rename = "continentCode")]
    continent_code: String,
    #[serde(default = "default_string_value")]
    country: String,
    #[serde(default = "default_string_value", rename = "countryCode")]
    country_code: String,
    #[serde(default = "default_string_value")]
    region: String,
    #[serde(default = "default_string_value", rename = "regionName")]
    region_name: String,
    #[serde(default = "default_string_value")]
    city: String,
    #[serde(default = "default_string_value")]
    district: String,
    #[serde(default = "default_string_value", rename = "zip")]
    postal_code: String,
    #[serde(default = "default_floating_value", rename = "lat")]
    latitude: f64,
    #[serde(default = "default_floating_value", rename = "lon")]
    longitude: f64,
    #[serde(default = "default_string_value", rename = "currency")]
    currency_code: String,
    #[serde(default = "default_string_value")]
    timezone: String,
    #[serde(default = "default_integer_value", rename = "offset")]
    utc_offset: i32,
    #[serde(default = "default_string_value")]
    currency: String,
    #[serde(default = "default_string_value", rename = "isp")]
    internet_service_provider: String,
    #[serde(default = "default_string_value", rename = "org")]
    organization: String,
    #[serde(default = "default_string_value", rename = "as")]
    autonomous_system_number: String,
    #[serde(default = "default_string_value", rename = "asname")]
    autonomous_system_name: String,
    #[serde(default = "default_string_value", rename = "reverse")]
    reverse_dns: String,
    #[serde(default = "default_boolean_value", rename = "mobile")]
    is_cellular_connection: bool,
    #[serde(default = "default_boolean_value", rename = "proxy")]
    is_known_proxy: bool,
    #[serde(default = "default_boolean_value", rename = "hosting")]
    is_data_center: bool,
}

fn default_string_value() -> String {
    String::from("Unknown")
}

fn default_floating_value() -> f64 {
    0.0
}

fn default_integer_value() -> i32 {
    0
}

fn default_boolean_value() -> bool {
    false
}

//------------------------------------------------------------//

async fn fetch_ip_address_info(
    ip_address: &str, // example: "1.1.1.1"
) -> Result<ApiResponse, Error> {
    let url = format!(
        "{}/{}?fields={}",
        API_URL,
        urlencoding::encode(ip_address),
        API_FIELDS_PARAMETER
    );

    let response = reqwest::get(&url).await?;

    let response_status = response.status();

    if !response_status.is_success() {
        return Err("Network request failed".into());
    }

    let server_info: ApiResponse = response.json().await?;

    return Ok(server_info);
}

//------------------------------------------------------------//

/// Fetch info about a ip address or hostname.
#[
    poise::command(
        slash_command,
        category = "Utility",
        user_cooldown = "5", // in seconds
    )
]
pub async fn ip_info(
    ctx: Context<'_>,

    #[description = "The address to lookup"]
    ip_address: String,
) -> Result<(), Error> {
    if ip_address.is_empty() {
        ctx.say("You need to provide an address to lookup.").await?;

        return Ok(());
    }

    let ip_address_info = match fetch_ip_address_info(&ip_address).await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("{}", e);

            ctx.say("An error occurred while fetching ip address info.").await?;

            return Ok(());
        },
    };

    let embed_title = format!("Information for {}", ip_address);

    let embed = {
        let embed_fields = vec![
            (
                "Location",
                format!(
                    "`{}, {}, {}, {}, {}`",
                    ip_address_info.postal_code,
                    ip_address_info.city,
                    ip_address_info.region_name,
                    ip_address_info.country,
                    ip_address_info.continent
                ),
                false
            ),
            (
                "Coordinates",
                format!(
                    "`{}, {}`",
                    ip_address_info.latitude,
                    ip_address_info.longitude
                ),
                true
            ),
            (
                "UTC Offset",
                format!("`{}`", ip_address_info.utc_offset),
                true
            ),
            (
                "Timezone",
                format!("`{}`", ip_address_info.timezone),
                true
            ),
            (
                "Currency Code",
                format!("`{}`", ip_address_info.currency_code),
                true
            ),
            (
                "Internet Service Provider",
                format!("`{}`", ip_address_info.internet_service_provider),
                true
            ),
            (
                "Organization",
                format!("`{}`", ip_address_info.organization),
                true
            ),
            (
                "ASN Identifier",
                format!("`{}`", ip_address_info.autonomous_system_number),
                true
            ),
            (
                "ASN Label",
                format!("`{}`", ip_address_info.autonomous_system_name),
                true
            ),
            (
                "Reverse DNS",
                format!("`{}`", ip_address_info.reverse_dns),
                true
            ),
            (
                "Known Cellular",
                format!("`{}`", ip_address_info.is_cellular_connection),
                true
            ),
            (
                "Known Proxy",
                format!("`{}`", ip_address_info.is_known_proxy),
                true
            ),
            (
                "Known Data Center",
                format!("`{}`", ip_address_info.is_data_center),
                true
            ),
        ];

        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(embed_title)
        .fields(embed_fields)
    };

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    Ok(())
}
