//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export type LanguageCode = string;

export type LanguageName = string;

export type LanguageConfig = {
    code: LanguageCode;
    name: LanguageName;
};

//------------------------------------------------------------//

const libre_translate_api_url = parseEnvironmentVariable(EnvironmentVariableName.LibreTranslateApiUrl, 'string');

const libre_translate_api_key = parseEnvironmentVariable(EnvironmentVariableName.LibreTranslateApiKey, 'string');

//------------------------------------------------------------//

const string_ends_with_punctuation = /[.!?]$/;

//------------------------------------------------------------//

export async function fetchSupportedLanguages(): Promise<LanguageConfig[]> {
    const response = await axios({
        method: 'GET',
        url: `${libre_translate_api_url}/languages`,
        validateStatus: (status_code) => status_code === 200,
    });

    return [
        ...response.data as LanguageConfig[],
        {
            code: 'auto',
            name: 'Automatically Detect',
        },
    ];
}

//------------------------------------------------------------//

export async function translate(
    text: string,
    from: 'auto' | LanguageCode,
    to: 'en' | LanguageCode,
): Promise<string> {
    let processed_text = text;

    /**
     * Adding punctuation to the end of the input text seems to result in better translations.
     */
    if (!string_ends_with_punctuation.test(processed_text)) {
        processed_text = `${processed_text}.`;
    }

    const response = await axios({
        method: 'POST',
        url: `${libre_translate_api_url}/translate`,
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            'q': processed_text,
            'source': from,
            'target': to,
            'format': 'text',
            'api_key': libre_translate_api_key,
        },
        validateStatus: (status_code) => status_code === 200,
    });

    return response.data?.translatedText ?? 'Translation failed';
}
