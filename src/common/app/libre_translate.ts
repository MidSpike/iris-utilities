//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

//------------------------------------------------------------//

const libre_translate_api_url = process.env.LIBRE_TRANSLATE_API_URL as string;
if (!libre_translate_api_url?.length) throw new Error('LIBRE_TRANSLATE_API_URL environment variable is not set');

const libre_translate_api_key = process.env.LIBRE_TRANSLATE_API_KEY as string;
if (!libre_translate_api_key?.length) throw new Error('LIBRE_TRANSLATE_API_KEY environment variable is not set');

//------------------------------------------------------------//

export type LanguageCode = string;

export type LanguageName = string;

export type LanguageConfig = {
    code: LanguageCode;
    name: LanguageName;
};

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
    const response = await axios({
        method: 'POST',
        url: `${libre_translate_api_url}/translate`,
        headers: {
            'Content-Type': 'application/json',
        },
        data: {
            'q': `${text}.`, // adding a period seems to result in better translations
            'source': from,
            'target': to,
            'format': 'text',
            'api_key': libre_translate_api_key,
        },
        validateStatus: (status_code) => status_code === 200,
    });

    return response.data?.translatedText ?? 'Translation failed';
}
