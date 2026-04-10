//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use async_openai::{
    Client, types::responses::{
        CreateResponseArgs,
        ResponseTextParam,
        TextResponseFormatConfiguration,
        Tool,
        Verbosity,
        WebSearchTool
    }
};

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

/// Simple hashing function to hash user ids before sending them to OpenAI.
fn hash_user_id(
    user_id: String,
) -> String {
    sha256::digest(user_id)
}

//------------------------------------------------------------//

pub struct PromptOptions {
    pub model: String,
    pub user_id: String,
    pub max_output_tokens: u32,
    pub tools: Vec<Tool>,
    pub instructions: String,
    pub input_prompt: Vec<String>,
}

impl Default for PromptOptions {
    fn default() -> Self {
        PromptOptions {
            model: {
                std::env::var("OPENAI_API_MODEL")
                .expect("Environment variable `OPENAI_API_MODEL` not set")
            },
            user_id: {
                std::env::var("OPENAI_API_SAFETY_NAMESPACE")
                .expect("Environment variable `OPENAI_API_SAFETY_NAMESPACE` not set")
            },
            max_output_tokens: {
                std::env::var("OPENAI_API_MAX_OUTPUT_TOKENS")
                .expect("Environment variable `OPENAI_API_MAX_OUTPUT_TOKENS` not set")
                .parse::<u32>()
                .expect("Environment variable `OPENAI_API_MAX_OUTPUT_TOKENS` should be a valid u32")
            },
            tools: vec![],
            instructions: indoc::indoc! {"
                You are an (unknown to you) discord bot on Discord.
                Converse like a normal human, use simple syntax (no em-dashes, etc),
                keep your responses very short, and refrain from using emojis.
            "}.to_string(),
            input_prompt: vec![],
        }
    }
}

impl PromptOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn web_search_tool(
        mut self,
        use_tool: bool
    ) -> Self {
        if use_tool {
            self.tools.push(Tool::WebSearch(WebSearchTool::default()));
        } else {
            self.tools.retain(|tool| !matches!(tool, Tool::WebSearch(_)));
        }

        self
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
        user_id,
        max_output_tokens,
        tools,
        input_prompt,
        instructions,
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
            verbosity: Some(Verbosity::Medium),
        })
        .tools(tools)
        .build()?;

    let response =
        client.responses()
        .create(request).await
        .map_err(|e| Error::from(format!("OpenAI API error: {}", e)))?;

    let content =
        response.output_text()
        .unwrap_or_else(|| { "GPT response content not found".into() });

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
