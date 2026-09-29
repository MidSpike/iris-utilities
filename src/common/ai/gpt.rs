//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use async_openai::{
    Client, types::{
        moderations::{
            CreateModerationRequest,
            ModerationContentPart,
            ModerationImageURLInput,
            ModerationInput,
            ModerationTextInput,
        },
        responses::{
            CreateResponseArgs,
            ResponseTextParam,
            TextResponseFormatConfiguration,
            Tool,
            Verbosity,
            WebSearchTool,
        }
    },
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
        .map_err(|e| Error::from(format!("OpenAI API error: {:?}", e)))?;

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
            content: content,
            tokens_used: total_tokens,
        }
    )
}

//------------------------------------------------------------//

#[derive(Debug)]
pub struct ModerationCheckResponseCategory {
    pub label: String,
    pub score: f32,
    pub flagged: bool,
}

pub struct ModerationCheckResponse {
    pub flagged: bool,
    pub categories: Vec<ModerationCheckResponseCategory>,
}

pub async fn moderation_check(
    input_text: String,
    input_image_urls: Vec<String>,
) -> Result<ModerationCheckResponse, Error> {
    if input_text.is_empty() {
        return Err("No input was provided to moderation check".into());
    }

    let client = Client::new();

    let mut moderation_input: Vec<ModerationContentPart> = vec![
        ModerationContentPart::Text(
            ModerationTextInput {
                text: input_text.clone()
            }
        ),
    ];

    for input_image_url in input_image_urls {
        moderation_input.push(
            ModerationContentPart::ImageUrl(
                ModerationImageURLInput {
                    image_url: input_image_url
                }
            )
        );
    }

    let response =
        client.moderations()
        .create(
            CreateModerationRequest {
                model: Some("omni-moderation-latest".into()),
                input: ModerationInput::MultiModal(moderation_input),
            }
        ).await
        .map_err(|e| Error::from(format!("OpenAI API error: {:?}", e)))?;

    let first_result = response.results.first().ok_or_else(|| Error::from("No moderation results returned from OpenAI API"))?;

    let mut first_result_categories: Vec<ModerationCheckResponseCategory> = Vec::new();
    {
        let category_scores = &first_result.category_scores;

        // Hate / Threats

        let hate_threats_score = category_scores.hate.max(category_scores.hate_threatening);
        let hate_threats_flagged = first_result.categories.hate || first_result.categories.hate_threatening;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Hate / Threats".into(),
                score: hate_threats_score,
                flagged: hate_threats_flagged,
            }
        );

        // Harassment

        let harassment_score = category_scores.harassment.max(category_scores.harassment_threatening);
        let harassment_flagged = first_result.categories.harassment || first_result.categories.harassment_threatening;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Harassment".into(),
                score: harassment_score,
                flagged: harassment_flagged,
            }
        );

        // Illicit / Weapons

        let illicit_score = category_scores.illicit.max(category_scores.illicit_violent);
        let illicit_flagged = first_result.categories.illicit || first_result.categories.illicit_violent;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Illicit / Weapons".into(),
                score: illicit_score,
                flagged: illicit_flagged,
            }
        );

        // Self-Harm

        let self_harm_score =
            category_scores.self_harm.max(category_scores.self_harm_intent)
            .max(category_scores.self_harm_instructions);
        let self_harm_flagged =
            first_result.categories.self_harm
            || first_result.categories.self_harm_intent
            || first_result.categories.self_harm_instructions;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Self-Harm".into(),
                score: self_harm_score,
                flagged: self_harm_flagged,
            }
        );

        // Sexual / Inappropriate

        let sexual_score = category_scores.sexual.max(category_scores.sexual_minors);
        let sexual_flagged = first_result.categories.sexual || first_result.categories.sexual_minors;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Sexual / Inappropriate".into(),
                score: sexual_score,
                flagged: sexual_flagged,
            }
        );

        // Violent / Graphic

        let violent_score = category_scores.violence.max(category_scores.violence_graphic);
        let violent_flagged = first_result.categories.violence || first_result.categories.violence_graphic;

        first_result_categories.push(
            ModerationCheckResponseCategory {
                label: "Violent / Graphic".into(),
                score: violent_score,
                flagged: violent_flagged,
            }
        );
    }

    Ok(
        ModerationCheckResponse {
            flagged: first_result.flagged,
            categories: first_result_categories,
        }
    )
}
