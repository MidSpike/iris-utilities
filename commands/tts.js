'use strict';

//#region remote dependencies
const axios = require('axios');
//#endregion remote dependencies

//#region local dependencies
const bot_config = require('../config.json');
const util = require('../utilities.js');
const { QueueItem, QueueItemPlayer } = require('../src/QueueManager.js');
const { CustomRichEmbed } = require('../src/CustomRichEmbed.js');
const { createConnection } = require('../src/createConnection.js');
const { disBotServers } = require('../src/sharedVariables.js');
const { DisBotCommand } = require('../src/DisBotCommander.js');
const google_languages_json = require('../files/google_languages.json');
const ibm_languages_json = require('../files/ibm_languages.json');
const bot_api_url = process.env.BOT_API_URL;
//#endregion local dependencies

const tts_opts_template = {
    provider:'',
    voice:'',
    callbacks:{
        start_callback:()=>{},
        end_callback:()=>{},
        error_callback:()=>{}
    }
};
async function playTTS(voice_channel, tts_text='Hello World! This Is The Default Text!', options=tts_opts_template) {
    const _options = {...tts_opts_template, ...options};

    const server = disBotServers[voice_channel.guild.id];

    const provider = _options.provider ?? 'ibm';
    const voice = _options.voice ?? (provider === 'google' ? 'en-us' : 'en-US_EmilyV3Voice');

    let voice_connection;
    try {
        voice_connection = await createConnection(voice_channel);
    } catch (error) {
        console.error(error);
        return error;
    }

    const stream = `${bot_api_url}/speech?type=${provider}&lang=${encodeURI(voice)}&text=${encodeURI(tts_text)}`;
    const streamMaker = async () => await stream;

    const {start_callback, end_callback, error_callback} = _options.callbacks;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, 250, start_callback, end_callback, error_callback);
    return await server.queue_manager.addItem(new QueueItem('tts', player, `TTS Message`, {
        text:`${tts_text}`,
        provider:`${provider}`,
        voice:`${voice}`
    }));
}

module.exports = new DisBotCommand('TTS', ['tts'], async (client, message, opts) => {
    const tts_input = opts.clean_command_args.join(' ').trim();
    if (tts_input.length === 0) {
        message.channel.send(new CustomRichEmbed({
            title:'TTS Time!',
            description:`There are a few ways that you can use TTS with ${bot_config.bot_common_name}...\nCheck out the following examples:`,
            fields:[
                {
                    name:`Simple Usage (Auto Mode Relies on Server Settings)`,
                    value:`${'```'}\n${opts.discord_command} Hello World! It is my time to shine!\n${'```'}`
                }, {
                    name:`Intermediate Usage (Choice of TTS Provider: IBM or Google)`,
                    value:[
                        `${'```'}\n${opts.discord_command} {ibm} Hello World! It is my time to shine!\n${'```'}`,
                        `${'```'}\n${opts.discord_command} {google} Hello World! It is my time to shine!\n${'```'}`
                    ].join('')
                }, {
                    name:`Advanced Usage (Choice of TTS Voice from either TTS Provider)`,
                    value:[
                        `${'```'}\n${opts.discord_command} {en-GB_KateV3Voice} Hello World! It is my time to shine!\n${'```'}`,
                        `${'```'}\n${opts.discord_command} {en-uk} Hello World! It is my time to shine!\n${'```'}`,
                        `There are many more TTS Voices from Google and IBM!\nRun \`${opts.command_prefix}langcodes\` to see what is available`,
                    ].join('')
                }
            ]
        }, message));
        return;
    }

    const regex_tts_command_args = /\{(.*?)\}/g;
    const regex_tts_command_args_bounds = /(\{|\})/g;
    const tts_command_args = tts_input.match(regex_tts_command_args);

    const tts_arg = (tts_command_args?.[0] ?? '').replace(regex_tts_command_args_bounds, ``);
    const tts_arg_potential_voice = [...Object.keys(google_languages_json), ...Object.keys(ibm_languages_json)].includes(tts_arg) ? tts_arg : undefined;
    const tts_arg_potential_provider = ['ibm', 'google'].includes(tts_arg) ? tts_arg : (Object.keys(google_languages_json).includes(tts_arg_potential_voice) ? 'google' : (Object.keys(ibm_languages_json).includes(tts_arg_potential_voice) ? 'ibm' : undefined));

    const tts_provider = tts_arg_potential_provider ?? bot_config.default_guild_config.tts_provider;
    const tts_voice = tts_arg_potential_voice ?? (tts_provider === 'ibm' ? opts.guild_config.tts_voice_ibm ?? bot_config.default_guild_config.tts_voice_ibm : opts.guild_config.tts_voice_google ?? bot_config.default_guild_config.tts_voice_google);

    // console.log({tts_arg, tts_arg_potential_voice, tts_arg_potential_provider, tts_provider, tts_voice});

    const tts_source = (message.attachments.size > 0 ? (await axios.get(message.attachments.first().url)).data : (tts_input ?? '').replace(regex_tts_command_args, ``)).trim();
    const tts_chunks = util.array_chunks(tts_source.split(/\s/g), 200).map(chunk => chunk.join(' '));
    for (let chunk_index = 0; chunk_index < tts_chunks.length; chunk_index++) {
        if (chunk_index > 0 && !message.guild.me.voice?.connection) break;
        const tts_chunk = tts_chunks[chunk_index];
        const tts_chunk_short = tts_chunks[chunk_index].length > 100 ? `${tts_chunk.slice(0, 100)}...` : tts_chunks[chunk_index];
        let tts_chunk_done_resolve;
        const tts_chunk_done = new Promise((resolve, reject) => tts_chunk_done_resolve = resolve);
        playTTS(message.member.voice.channel, tts_chunk, {
            provider:tts_provider,
            voice:tts_voice,
            callbacks:{
                start_callback:() => {
                    message.channel.send(new CustomRichEmbed({
                        title:'Playing TTS',
                        description:`**Provider:** \`${tts_provider}\`\n**Voice:** \`${tts_voice}\`\n**Message:**${'```'}\n${tts_chunk_short}\n${'```'}`
                    }, message));
                }, end_callback:() => {
                    tts_chunk_done_resolve();
                }
            }
        }).then((queue_manager) => { // Item was added to queue
            if (tts_chunks.length > 1) {
                if (chunk_index === 0) {
                    message.channel.send(new CustomRichEmbed({
                        title:'Started Adding TTS Chunks',
                        description:`You told ${bot_config.bot_common_name} to play something large via TTS...\nEach TTS chunk might take a little bit to load before playing!`
                    }, message));
                }
            }
            message.channel.send(new CustomRichEmbed({
                title:'Added TTS',
                description:`**Provider:** \`${tts_provider}\`\n**Voice:** \`${tts_voice}\`\n**Message:**${'```'}\n${tts_chunk_short}\n${'```'}`
            }, message));
        });
        await tts_chunk_done;
    }
});
