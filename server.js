'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

//---------------------------------------------------------------------------------------------------------------//

const os = require('os');
os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const moment = require('moment-timezone');

const GoogleTranslate = require('translate-google');

const SpongeBobMock = require('spmock');

const ytdl = require('ytdl-core');
const { GoogleTranslateTTS } = require('google-translate-tts');

const Discord = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

const { Timer,
        pseudoUniqueId } = require('./src/utilities.js');

//---------------------------------------------------------------------------------------------------------------//

const app = express();
app.set('port', process.env.BOT_API_SERVER_PORT);

//---------------------------------------------------------------------------------------------------------------//

router.get('/speech', async (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/speech' endpoint!`);
        res.status(403);
        res.set({ 'Content-Type': 'application/json' });
        res.send(JSON.stringify({
            'status': '403',
            'message': 'bot api server token is not valid!'
        }, null, 2));
    } else {
        res.status(200);
        res.set({ 'Content-Type': 'audio/mpeg' });
        const speak_type = req.query.type ?? 'google'; // google | ibm
        const speak_lang = req.query.lang ?? (speak_type === 'ibm' ? 'en-US_AllisonV3Voice' : 'en-us');
        const speak_msg = req.query.text ?? 'hello world';
        console.log({ speak_msg });
        if (speak_type === 'google') {
            const gt_tts = new GoogleTranslateTTS({
                language: speak_lang,
                text: speak_msg,
            });
            const gt_tts_stream = await gt_tts.stream();
            gt_tts_stream.pipe(res);
        } else if (speak_type === 'ibm') {
            console.warn('TTS TEST');
            request.get(`${process.env.IBM_TTS_API_URL}?voice=${encodeURIComponent(speak_lang)}&text=${encodeURIComponent(speak_msg)}&download=true&accept=audio%2Fmp3`).pipe(res);
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/ytinfo', async (req, res) => {
    res.set({ 'Content-Type': 'application/json' });
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/ytinfo' endpoint!`);
        res.status(403);
        res.send(JSON.stringify({
            'status': '403',
            'message': 'bot api server token is not valid!',
        }, null, 2));
    } else {
        res.set({ 'Content-Type': 'application/json' });
        if (req.query.video_id) {
            console.info(`[/ytinfo] - video_id:`, req.query.video_id);

            let yt_info;
            let num_attempts = 0;
            while (!yt_info && num_attempts < 2) {
                await Timer(num_attempts * 2_500);
                yt_info = await ytdl.getBasicInfo(`https://youtu.be/${req.query.video_id}`, {
                    requestOptions: {
                        headers: {
                            'Accept-Language': 'en-US,en;q=0.5',
                            'User-Agent': process.env.YTDL_USER_AGENT,
                            'Cookie': process.env.YTDL_COOKIE,
                            'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
                        },
                    },
                }).catch(console.warn);
                num_attempts++;
            }

            if (!yt_info) {
                console.error(`Can\'t find video info for video id: ${req.query.video_id}`);
                res.status(500);
            } else {
                res.status(200);
                const regex_brackets = /(\<|\>|\(|\)|\[|\]|\{|\})/g;

                yt_info.videoDetails.title = yt_info.videoDetails.title ?? '404 not found';
                yt_info.videoDetails.author.name = yt_info.videoDetails.author.name ?? '404 not found';

                console.log('yt_info.videoDetails', yt_info.videoDetails);

                yt_info.videoDetails.title = `${Discord.Util.escapeMarkdown(yt_info.videoDetails.title).replace(regex_brackets, ``)}`;
                yt_info.videoDetails.author.name = `${Discord.Util.escapeMarkdown(yt_info.videoDetails.author.name).replace(regex_brackets, ``)}`;

                yt_info.videoDetails.title = yt_info.videoDetails.title.replace(yt_info.videoDetails.author.name, '');
                yt_info.videoDetails.title = yt_info.videoDetails.title.replace(/((official (video|audio|music|lyrics|lyric)(\s(video|audio|music))*)|(lyrics|lyric))/gi, '');
                yt_info.videoDetails.title = yt_info.videoDetails.title.replace(/[\/\-\_\\]/g, ' '); // replace these with a space
                yt_info.videoDetails.title = yt_info.videoDetails.title.replace(/\s+/g, ` `); // replaces many spaces with one space
                yt_info.videoDetails.title = yt_info.videoDetails.title.trim();
            }

            res.send(JSON.stringify(yt_info ?? {}, null, 2));
        } else {
            res.status(400);
            res.send(JSON.stringify({
                'status': '400',
                'message': 'Expected parameter \'video_id\' in the query!',
            }, null, 2));
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/translate', async (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/translate' endpoint!`);
        res.status(403);
        res.set({ 'Content-Type': 'application/json' });
        res.send(JSON.stringify({
            'status': '403',
            'message': 'bot api server token is not valid!'
        }, null, 2));
    } else {
        res.set({ 'Content-Type': 'application/json' });
        const original_text = req.query.text ?? `Nothing was sent to the '/translate' endpoint!`;
        const translate_to = req.query.translate_to ?? 'en';
        const translated_text = await GoogleTranslate(original_text, { to: translate_to });
        res.send(JSON.stringify({
            'original_text': `${original_text}`,
            'translated_from_language': `auto-detect`,
            'translated_to_language': `${translate_to}`,
            'translated_text': `${translated_text}`
        }, null, 2));
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/spmock', (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/spmock' endpoint!`);
        res.status(403);
        res.set({ 'Content-Type': 'application/json' });
        res.send(JSON.stringify({
            'status': '403',
            'message': 'bot api server token is not valid!'
        }, null, 2));
    } else {
        res.set({ 'Content-Type': 'application/json' });
        const original_text = req.query.text ?? `Nothing was sent to the '/spmock' endpoint!`;
        const spmock_text = SpongeBobMock.spmock(original_text);
        res.send(JSON.stringify({
            'original_text': `${original_text}`,
            'spmock_text': `${spmock_text}`
        }, null, 2));
    }
});

//---------------------------------------------------------------------------------------------------------------//

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use('/', router);

//---------------------------------------------------------------------------------------------------------------//

app.listen(app.get('port'), () => {
    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`Started Bot Server On Port: ${app.get('port')}`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);
});

//---------------------------------------------------------------------------------------------------------------//

/* prevent the process from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('unhandledRejection at:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

/* prevent the process from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('uncaughtException at:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});
