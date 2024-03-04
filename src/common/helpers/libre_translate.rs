//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug)]
pub struct LibreTranslateLanguage {
    pub code: String,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(transparent)]
pub struct LibreTranslateLanguagesApiResponse {
    languages: Vec<LibreTranslateLanguage>,
}

//------------------------------------------------------------//

pub async fn fetch_supported_languages() -> Result<Vec<LibreTranslateLanguage>, Error> {
    let libre_translate_url =
        std::env::var("LIBRE_TRANSLATE_API_URL")
        .expect("Environment variable LIBRE_TRANSLATE_API_URL not set");

    let languages_url = format!("{}/languages", libre_translate_url);

    let mut response: LibreTranslateLanguagesApiResponse =
        reqwest::get(&languages_url).await?
        .json().await?;

    response.languages.push(
        LibreTranslateLanguage {
            code: String::from("auto"),
            name: String::from("Automatically Detect"),
        }
    );

    Ok(response.languages)
}

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug)]
struct LibreTranslateTranslationApiResponse {
    #[serde(rename = "translatedText")]
    translated_text: String,
}

//------------------------------------------------------------//

pub async fn translate(
    text: &str,
    from_language: &str,
    to_language: &str,
) -> Result<String, Error> {
    let libre_translate_url =
        std::env::var("LIBRE_TRANSLATE_API_URL")
        .expect("Environment variable LIBRE_TRANSLATE_API_URL not set");

    let translate_url = format!("{}/translate", libre_translate_url);

    let supported_languages = fetch_supported_languages().await?;

    let source_language = match supported_languages.iter().find(
        // both must be checked since discord sometimes doesn't enforce autocomplete
        |l| l.code == from_language || l.name.to_lowercase() == from_language.to_lowercase()
    ) {
        Some(l) => l.code.clone(),
        None => Err(format!("Language code {} is not supported.", from_language))?,
    };

    let target_language = match supported_languages.iter().find(
        // both must be checked since discord sometimes doesn't enforce autocomplete
        |l| l.code == to_language || l.name.to_lowercase() == to_language.to_lowercase()
    ) {
        Some(l) => l.code.clone(),
        None => Err(format!("Language code {} is not supported.", to_language))?,
    };

    let params = std::collections::HashMap::from([
        ("q", text),
        ("source", &source_language),
        ("target", &target_language),
        ("format", "text"),
    ]);

    let response: LibreTranslateTranslationApiResponse =
        reqwest::Client::new()
        .post(&translate_url)
        .json(&params)
        .send().await?
        .json().await?;

    Ok(response.translated_text)
}
