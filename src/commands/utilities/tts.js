'use strict';

//#region local dependencies
const axios = require('axios');

const bot_config = require('../../../config.json');

const SHARED_VARIABLES = require('../../SHARED_VARIABLES.js');

const { array_chunks } = require('../../utilities.js');

const { QueueItem, QueueItemPlayer } = require('../../libs/QueueManager.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { createConnection } = require('../../libs/createConnection.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const google_languages_json = require('../../../files/google_languages.json');
const ibm_languages_json = require('../../../files/ibm_languages.json');
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

    const server = SHARED_VARIABLES.disBotServers[voice_channel.guild.id];

    const provider = _options.provider ?? 'ibm';
    const voice = _options.voice ?? (provider === 'google' ? 'en-us' : 'en-US_EmilyV3Voice');

    let voice_connection;
    try {
        voice_connection = await createConnection(voice_channel);
    } catch (error) {
        console.error(error);
        return error;
    }

    const stream = `${process.env.BOT_API_SERVER_URL}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${provider}&lang=${encodeURI(voice)}&text=${encodeURI(tts_text)}`;
    const stream_maker = () => stream;

    const {start_callback, end_callback, error_callback} = _options.callbacks;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, stream_maker, 10.0, start_callback, end_callback, error_callback);
    return await server.queue_manager.addItem(new QueueItem('tts', player, `TTS Message`, {
        text:`${tts_text}`,
        provider:`${provider}`,
        voice:`${voice}`
    }));
}

module.exports = new DisBotCommand({
    name:'TTS',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Text-to-Speech',
    aliases:['tts'],
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, clean_command_args, guild_config_manipulator } = opts;

        const guild_config = guild_config_manipulator.config;

        const tts_input = clean_command_args.join(' ').trim();
        if (tts_input.length === 0 && message.attachments.length === 0) {
            message.channel.send(new CustomRichEmbed({
                title:'TTS Time!',
                description:`There are a few ways that you can use TTS with ${bot_config.common_name}...\nCheck out the following examples:`,
                fields:[
                    {
                        name:`Simple Usage (Auto Mode Relies on Server Settings)`,
                        value:`${'```'}\n${discord_command} Hello World! It is my time to shine!\n${'```'}`
                    }, {
                        name:`Intermediate Usage (Choice of TTS Provider: IBM or Google)`,
                        value:[
                            `${'```'}\n${discord_command} {ibm} Hello World! It is my time to shine!\n${'```'}`,
                            `${'```'}\n${discord_command} {google} Hello World! It is my time to shine!\n${'```'}`
                        ].join('')
                    }, {
                        name:`Advanced Usage (Choice of TTS Voice from either TTS Provider)`,
                        value:[
                            `${'```'}\n${discord_command} {en-GB_KateV3Voice} Hello World! It is my time to shine!\n${'```'}`,
                            `${'```'}\n${discord_command} {en-uk} Hello World! It is my time to shine!\n${'```'}`,
                            `There are many more TTS Voices from Google and IBM!\nRun \`${command_prefix}langcodes\` to see what is available`,
                        ].join('')
                    }
                ]
            }, message));
            return;
        }

        if (!message.member.voice?.channel) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Uh Oh!',
                description:'You need to join a voice channel first!'
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
        const tts_voice = tts_arg_potential_voice ?? (tts_provider === 'ibm' ? guild_config.tts_voice_ibm ?? bot_config.default_guild_config.tts_voice_ibm : guild_config.tts_voice_google ?? bot_config.default_guild_config.tts_voice_google);

        const tts_source = (message.attachments.size > 0 ? (await axios.get(message.attachments.first().url)).data : (tts_input ?? '').replace(regex_tts_command_args, ``)).trim();
        const tts_chunks = array_chunks(tts_source.split(/\s/g), 100).map(chunk => chunk.join(' '));

        for (let chunk_index = 0; chunk_index < tts_chunks.length; chunk_index++) {
            if (chunk_index > 0 && !message.guild.me.voice?.connection) break;
            const tts_chunk = tts_chunks[chunk_index];
            const tts_chunk_short = tts_chunk.length > 100 ? `${tts_chunk.slice(0, 100)}...` : tts_chunk;
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
                    message.channel.send(new CustomRichEmbed({
                        title:'Adding TTS Chunk',
                        description:[
                            `You told ${bot_config.common_name} to say a lot of words using TTS...`,
                            `Each TTS Chunk might take a little bit of time to load before playing!`
                        ].join('\n')
                    }, message));
                }
                if (queue_manager.queue.length > 1) {
                    message.channel.send(new CustomRichEmbed({
                        title:'Added TTS',
                        description:`**Provider:** \`${tts_provider}\`\n**Voice:** \`${tts_voice}\`\n**Message:**${'```'}\n${tts_chunk_short}\n${'```'}`
                    }, message));
                }
            });
            await tts_chunk_done;
        }
    },
});
