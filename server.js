'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

const os = require('os'); os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const moment = require('moment-timezone');

const GoogleTranslate = require('translate-google');

const SpongeBobMock = require('spmock');

const gtts = require('node-gtts');
const ytdl = require('ytdl-core');

//---------------------------------------------------------------------------------------------------------------//

const { pseudoUniqueId } = require('./src/utilities.js');

//---------------------------------------------------------------------------------------------------------------//

const app = express();
app.set('port', process.env.BOT_API_SERVER_PORT);

//---------------------------------------------------------------------------------------------------------------//

router.get('/speech', (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/speech' endpoint!`);
        res.status(403);
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'403',
            'message':'bot api token is not valid!'
        }, null, 2));
    } else {
        res.status(200);
        res.set({'Content-Type':'audio/mpeg'});
        const speak_type = req.query.type ?? 'google'; // google | ibm
        const speak_lang = req.query.lang ?? (speak_type === 'ibm' ? 'en-US_AllisonV3Voice' : 'en-us');
        const speak_msg = req.query.text ?? 'hello world';
        if (speak_type === 'google') {
            gtts(speak_lang).stream(speak_msg).pipe(res);
        } else if (speak_type === 'ibm') {
            request.get(`${process.env.IBM_TTS_API_URL}?voice=${encodeURI(speak_lang)}&text=${encodeURI(speak_msg)}&download=true&accept=audio%2Fmp3`).pipe(res);
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/ytinfo', async (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/ytinfo' endpoint!`);
        res.status(403);
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'403',
            'message':'bot api token is not valid!'
        }, null, 2));
    } else {
        res.set({'Content-Type':'application/json'});
        if (req.query.video_id) {
            console.info(`[/ytinfo] - video_id:`, req.query.video_id);
            let yt_info;
            try {
                yt_info = await ytdl.getBasicInfo(`https://youtu.be/${req.query.video_id}`);
            } catch (error) {
                console.trace(`Can't find video info for video id: ${req.query.video_id}`, error);
                yt_info = {};
            } finally {
                res.send(JSON.stringify(yt_info, null, 2));
            }
        } else {
            res.send(JSON.stringify({
                'status':'200',
                'message':'Expected parameter \'video_id\' in the query!'
            }, null, 2));
        }
    }
});

router.get('/ytdl', async (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/ytdl' endpoint!`);
        res.status(403);
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'403',
            'message':'bot api token is not valid!'
        }, null, 2));
    } else {
        res.set({'Content-Type':'audio/mpeg'});
        if (req.query.url) {
            try {
                const ytdl_stream_id = `${pseudoUniqueId()} - ${req.query.url}`;

                const ytdl_stream = ytdl(req.query.url, {
                    'lang':'en',
                    'quality':'highestaudio',
                    'filter':'audioonly',
                    'highWaterMark':1<<25 // 32 MB
                });

                console.time(`[/ytdl] - Stream Time for ${ytdl_stream_id}`);
                const res_stream = ytdl_stream.pipe(res);

                res_stream.on('error', (error) => {
                    console.timeEnd(`[/ytdl] - Stream Time for ${ytdl_stream_id}`);
                    console.trace(`Failed while streaming ${ytdl_stream_id}: `, error);
                });

                res_stream.on('finish', () => {
                    console.timeEnd(`[/ytdl] - Stream Time for ${ytdl_stream_id}`);
                });
            } catch (error) {
                console.trace(`Failed to stream: ${req.query.url}`, error);
            }
        } else {
            res.set({'Content-Type':'application/json'});
            res.send(JSON.stringify({
                'status':'200',
                'message':'Expected parameter \'url\' in the query!'
            }, null, 2));
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/translate', async (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/translate' endpoint!`);
        res.status(403);
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'403',
            'message':'bot api token is not valid!'
        }, null, 2));
    } else {
        res.set({'Content-Type':'application/json'});
        const original_text = req.query.text ?? `Nothing was sent to the '/translate' endpoint!`;
        const translate_to = req.query.translate_to ?? 'en';
        const translated_text = await GoogleTranslate(original_text, {to:translate_to});
        res.send(JSON.stringify({
            'original_text':`${original_text}`,
            'translated_from_language':`auto-detect`,
            'translated_to_language':`${translate_to}`,
            'translated_text':`${translated_text}`
        }, null, 2));
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/spmock', (req, res) => {
    if (req.query?.token !== process.env.BOT_API_SERVER_TOKEN) {
        console.warn(`Unauthorized request to the '/spmock' endpoint!`);
        res.status(403);
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'403',
            'message':'bot api token is not valid!'
        }, null, 2));
    } else {
        res.set({'Content-Type':'application/json'});
        const original_text = req.query.text ?? `Nothing was sent to the '/spmock' endpoint!`;
        const spmock_text = SpongeBobMock.spmock(original_text);
        res.send(JSON.stringify({
            'original_text':`${original_text}`,
            'spmock_text':`${spmock_text}`
        }, null, 2));
    }
});

//---------------------------------------------------------------------------------------------------------------//

app.use(bodyParser.urlencoded({extended:false})); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use('/', router);

//---------------------------------------------------------------------------------------------------------------//

app.listen(app.get('port'), () => {
    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`Started Bot Server On Port: ${app.get('port')}`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);
});

//---------------------------------------------------------------------------------------------------------------//

/* prevent the api server from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('unhandledRejection at:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

/* prevent the api server from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('uncaughtException at:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});