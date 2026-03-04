//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use async_openai::{
    Client, types::responses::{
        CreateResponseArgs,
        ResponseTextParam,
        TextResponseFormatConfiguration,
    }
};

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

/// Simple hashing function to hash user ids before sending them to OpenAI.
fn hash_user_id(user_id: String) -> String {
    sha256::digest(user_id)
}

//------------------------------------------------------------//

pub struct PromptOptions {
    pub model: String,
    pub user_id: String,
    pub instructions: String,
    pub input_prompt: Vec<String>,
    pub max_output_tokens: u32,
}

impl Default for PromptOptions {
    fn default() -> Self {
        PromptOptions {
            model:
                std::env::var("OPENAI_API_MODEL")
                .unwrap_or_else(|_| "gpt-5-nano".to_string()),
            user_id:
                std::env::var("OPENAI_API_SAFETY_NAMESPACE")
                .unwrap_or_else(|_| "iris-utilities".to_string()),
            instructions: "You are a helpful assistant.".to_string(),
            input_prompt: vec![],
            max_output_tokens: 512,
        }
    }
}

pub struct PromptResponse {
    pub content: String,
    pub tokens_used: u32,
}

/// # Summary
///
/// Prompts OpenAI's Responses API to receive a response from GPT using the async-openai SDK.
///
/// # Arguments
///
/// * `model` - The model to use (e.g., "gpt-5-nano")
/// * `instructions` - The instructions for the model
/// * `input_prompt` - The input prompt to send to the model
/// * `user_id` - The user id for safety namespace hashing
/// * `max_output_tokens` - The maximum number of output tokens to generate
///
/// # Returns
///
/// * `Ok(PromptResponse)` - The response from GPT
/// * `Err(Error)` - An error
pub async fn prompt(
    options: PromptOptions,
) -> Result<PromptResponse, Error> {
    let PromptOptions {
        model,
        instructions,
        input_prompt,
        user_id,
        max_output_tokens,
    } = options;

    if input_prompt.is_empty() {
        return Err("No input was provided to prompt GPT".into());
    }

    let client = Client::new();

    let request =
        CreateResponseArgs::default()
        .safety_identifier(hash_user_id(user_id))
        .model(&model)
        .instructions(instructions)
        .input(input_prompt)
        .max_output_tokens(max_output_tokens)
        .text(ResponseTextParam {
            format: TextResponseFormatConfiguration::Text,
            verbosity: None,
        })
        .build()?;

    let response =
        client.responses().create(request).await
        .map_err(|e| Error::from(format!("OpenAI API error: {}", e)))?;

    let content =
        response.output_text()
        .unwrap_or_else(|| { "No response content found".into() });

    // Get token usage
    let total_tokens =
        response.usage
        .map(|usage| usage.total_tokens)
        .unwrap_or(0);

    Ok(
        PromptResponse {
            content,
            tokens_used: total_tokens,
        }
    )
}
