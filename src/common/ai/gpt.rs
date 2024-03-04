//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

#[allow(dead_code)] // unused enum variants
#[derive(Serialize, Deserialize, Debug)]
pub enum GptMessageRole {
    #[serde(rename = "system")] // match OpenAi Api
    System,
    #[serde(rename = "assistant")] // match OpenAi Api
    Assistant,
    #[serde(rename = "user")] // match OpenAi Api
    User,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GptMessage {
    role: GptMessageRole,
    content: String,
}

impl GptMessage {
    pub fn new(role: GptMessageRole, content: String) -> Self {
        Self {
            role: role,
            content: content,
        }
    }

    pub fn system(content: String) -> Self {
        Self::new(GptMessageRole::System, content)
    }

    pub fn assistant(content: String) -> Self {
        Self::new(GptMessageRole::Assistant, content)
    }

    pub fn user(content: String) -> Self {
        Self::new(GptMessageRole::User, content)
    }
}

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug)]
struct OpenAiChatCompletionsApiRequest {
    model: String,
    messages: Vec<GptMessage>,
    max_tokens: u16,
    temperature: f32, // scale from 0.0 to 2.0
    user: String, // should be a hashed user identifier
}

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug)]
struct ResponseChoice {
    message: GptMessage,
}

#[derive(Serialize, Deserialize, Debug)]
struct ResponseUsage {
    total_tokens: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct ResponseError {
    message: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct OpenAiChatCompletionsApiResponse {
    error: Option<ResponseError>,
    choices: Option<Vec<ResponseChoice>>,
    usage: Option<ResponseUsage>,
}

//------------------------------------------------------------//

/// # Summary
/// Simple hashing function to hash user ids before sending them to OpenAI.
fn hash_user_id(user_id: String) -> String {
    sha256::digest(user_id)
}

//------------------------------------------------------------//

pub struct PromptResponse {
    pub content: String,
    pub tokens_used: u32,
}

/// # Summary
///
/// Prompts OpenAi's Chat Completions api to receive a response from GPT.
///
/// # Arguments
///
/// * `system_message` - The system message to prompt GPT with.
/// * `user_message` - The user message to prompt GPT with.
/// * `user_id` - The id of the user.
///
/// # Returns
///
/// * `Ok(String)` - The response from GPT.
/// * `Err(Error)` - An error.
pub async fn prompt(
    messages: Vec<GptMessage>,
    user_id: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u16>,
) -> Result<PromptResponse, Error> {
    let open_ai_token = std::env::var("OPEN_AI_TOKEN").expect("Environment variable OPEN_AI_TOKEN not set");
    let open_ai_gpt_model = std::env::var("OPEN_AI_GPT_MODEL").expect("Environment variable OPEN_AI_GPT_MODEL not set");

    let temperature = temperature.unwrap_or(1.0); // default to 1.0

    if !(0.0..=2.0).contains(&temperature) {
        return Err("Temperature must be between 0.0 and 2.0".into());
    }

    let max_tokens = max_tokens.unwrap_or(256); // default to 256

    let user_id: String = match user_id {
        Some(user_id) => user_id,
        None => String::from("not_a_user"),
    };

    let reqwest_client = reqwest::Client::new();

    if messages.is_empty() {
        return Err("No messages were provided to prompt gpt".into());
    }

    let response =
        reqwest_client
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(open_ai_token)
        .json(
            &OpenAiChatCompletionsApiRequest {
                model: open_ai_gpt_model,
                messages: messages,
                temperature: temperature,
                max_tokens: max_tokens,
                user: hash_user_id(user_id),
            }
        )
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await?;

    let response_status_code = response.status();

    // println!("OpenAI API response status code: {}", response_status_code);

    let response_json: OpenAiChatCompletionsApiResponse = response.json().await?;

    // println!("OpenAI API response JSON: {:#?}", response_json);

    if response_status_code != 200 {
        let response_error = response_json.error.expect("OpenAI API response JSON is missing \"error\" object in response to non-200 status code");

        let response_error_message = response_error.message;

        return Err(format!("OpenAI API error: {}", response_error_message).into());
    }

    let usage = response_json.usage.expect("OpenAI API response JSON is missing \"usage\" object in response to 200 status code");

    let total_tokens = usage.total_tokens;

    let response_choices = response_json.choices.expect("OpenAI API response JSON is missing \"choices\" array in response to 200 status code");

    let first_response_choice = response_choices.first().expect("OpenAI API response JSON \"choices\" array is empty");

    let first_response_choice_text = first_response_choice.message.content.to_string();

    return Ok(
        PromptResponse {
            content: first_response_choice_text,
            tokens_used: total_tokens,
        }
    );
}
