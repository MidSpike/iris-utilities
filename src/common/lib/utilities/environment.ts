//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

export enum EnvironmentVariableName {
    MongoConnectionUrl = 'MONGO_CONNECTION_URL',
    MongoDatabaseName = 'MONGO_DATABASE_NAME',
    MongoUserConfigsCollectionName = 'MONGO_USER_CONFIGS_COLLECTION_NAME',
    MongoSuperPeopleCollectionName = 'MONGO_SUPER_PEOPLE_COLLECTION_NAME',
    MongoGuildConfigsCollectionName = 'MONGO_GUILD_CONFIGS_COLLECTION_NAME',

    DiscordBotApiToken = 'DISCORD_BOT_API_TOKEN',
    DiscordBotSupportGuildInviteUrl = 'DISCORD_BOT_SUPPORT_GUILD_INVITE_URL',
    DiscordBotCentralLoggingFeedbackWebhook = 'DISCORD_BOT_CENTRAL_LOGGING_FEEDBACK_WEBHOOK',
    DiscordBotCentralLoggingDiagnosticsWebhook = 'DISCORD_BOT_CENTRAL_LOGGING_DIAGNOSTICS_WEBHOOK',
    DiscordBotCentralLoggingGuildRetentionWebhook = 'DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK',
    DiscordBotCentralLoggingAnonymousCommandHistoryWebhook = 'DISCORD_BOT_CENTRAL_LOGGING_ANONYMOUS_COMMAND_HISTORY_WEBHOOK',
    DiscordBotCentralLoggingHistoryDeletionRequestsWebhook = 'DISCORD_BOT_CENTRAL_LOGGING_HISTORY_DELETION_REQUESTS_WEBHOOK',
    DiscordBotVerboseInteractionLogging = 'DISCORD_BOT_VERBOSE_INTERACTION_LOGGING',

    ChatAiDefaultModel = 'CHAT_AI_DEFAULT_MODEL',
    ChatAiAdvancedModel = 'CHAT_AI_ADVANCED_MODEL',
    ChatAiMaxTokens = 'CHAT_AI_MAX_TOKENS',
    ChatAiMaxUserInputSize = 'CHAT_AI_MAX_USER_INPUT_SIZE',
    ChatAiPreviousMessagesAmount = 'CHAT_AI_PREVIOUS_MESSAGES_AMOUNT',

    YoutubeApiKey = 'YOUTUBE_API_KEY',
    YoutubeUserAgent = 'YTDL_USER_AGENT',
    YoutubeCookie = 'YTDL_COOKIE',
    YoutubeIdentityToken = 'YTDL_X_YOUTUBE_IDENTITY_TOKEN',

    SoundcloudClientId = 'SOUNDCLOUD_CLIENT_ID',

    IbmTextToSpeechApiUrl = 'IBM_TTS_API_URL',
    IbmTextToSpeechApiKey = 'IBM_TTS_API_KEY',

    LibreTranslateApiUrl = 'LIBRE_TRANSLATE_API_URL',
    LibreTranslateApiKey = 'LIBRE_TRANSLATE_API_KEY',

    OpenAiUsage = 'OPENAI_USAGE',
    OpenAiApiKey = 'OPENAI_API_KEY',
}

//------------------------------------------------------------//

type JSONParseType = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

//------------------------------------------------------------//

type EnvironmentVariableParseAs = 'string' | 'integer' | 'number' | 'bigint' | 'boolean' | 'json';

type EnvironmentVariableValidator<T> = (value: T) => boolean;

type EnvironmentVariableReturnType = string | number | bigint | boolean | JSONParseType;

//------------------------------------------------------------//

/**
 * Parses an environment variable.
 * Will throw if the environment variable is not set, empty, or not valid for the specified parse type.
 */
export function parseEnvironmentVariable<T extends string>(
    name: EnvironmentVariableName,
    parse_as: 'string',
    validator?: EnvironmentVariableValidator<T>,
): T;
export function parseEnvironmentVariable<T extends number>(
    name: EnvironmentVariableName,
    parse_as: 'integer' | 'number',
    validator?: EnvironmentVariableValidator<T>,
): T;
export function parseEnvironmentVariable<T extends bigint>(
    name: EnvironmentVariableName,
    parse_as: 'bigint',
    validator?: EnvironmentVariableValidator<T>,
): T;
export function parseEnvironmentVariable<T extends boolean>(
    name: EnvironmentVariableName,
    parse_as: 'boolean',
    validator?: EnvironmentVariableValidator<T>,
): T;
export function parseEnvironmentVariable<T extends Record<string, unknown>>(
    name: EnvironmentVariableName,
    parse_as: 'json',
    validator?: EnvironmentVariableValidator<T>,
): T;
export function parseEnvironmentVariable(
    name: EnvironmentVariableName,
    parse_as: EnvironmentVariableParseAs,
    validator?: EnvironmentVariableValidator<EnvironmentVariableReturnType>,
): EnvironmentVariableReturnType {
    const environment_variable = process.env[name];
    if (environment_variable === undefined) throw new Error(`environment variable: ${name}; is not set`);

    let parsed_environment_variable: EnvironmentVariableReturnType;

    switch (parse_as) {
        case 'string': {
            parsed_environment_variable = environment_variable;

            break;
        }

        case 'integer':
        case 'number': {
            if (environment_variable.length < 1) throw new Error(`environment variable: ${name}; is empty`);

            parsed_environment_variable = Number.parseFloat(environment_variable);

            // this is safe since calling `Math.floor` on `NaN` will result in `NaN`
            if (parse_as === 'integer') parsed_environment_variable = Math.floor(parsed_environment_variable);

            if (Number.isNaN(parsed_environment_variable)) throw new Error(`environment variable: ${name}; is not a valid number`);

            break;
        }

        case 'bigint': {
            if (environment_variable.length < 1) throw new Error(`environment variable: ${name}; is empty`);

            try {
                parsed_environment_variable = BigInt(environment_variable);
            } catch (error) {
                throw new Error(`environment variable: ${name}; is not a valid bigint`);
            }

            break;
        }

        case 'boolean': {
            if (environment_variable === undefined) throw new Error(`environment variable: ${name}; is not set`);
            if (environment_variable.length < 1) throw new Error(`environment variable: ${name}; is empty`);

            if (
                environment_variable !== 'true' &&
                environment_variable !== 'false'
            ) throw new Error(`environment variable: ${name}; is not a valid boolean`);

            parsed_environment_variable = environment_variable === 'true'; // b/c of the check above, we can safely assume ('true' | 'false') here

            break;
        }

        case 'json': {
            if (environment_variable === undefined) throw new Error(`environment variable: ${name}; is not set`);
            if (environment_variable.length < 1) throw new Error(`environment variable: ${name}; is empty`);

            try {
                parsed_environment_variable = JSON.parse(environment_variable) as JSONParseType;
            } catch (error) {
                throw new Error(`environment variable: ${name}; is not valid JSON`);
            }

            break;
        }

        default: {
            throw new Error(`parseEnvironmentVariable(): Unknown parse_as: ${parse_as};`);
        }
    }

    if (
        typeof validator === 'function' &&
        !validator(parsed_environment_variable) // validator returns false if the value is invalid
    ) {
        throw new Error(`environment variable: ${name}; is not valid`);
    }

    return parsed_environment_variable;
}
