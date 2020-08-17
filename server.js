'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

const os = require('os'); os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const translate = require('translate-google');

const spmock = require('spmock');

const gtts = require('node-gtts');
const ytdl = require('ytdl-core');

//---------------------------------------------------------------------------------------------------------------//

const { pseudoUniqueId } = require('./utilities.js');

//---------------------------------------------------------------------------------------------------------------//

const app = express();
app.set('port', process.env.BOT_API_SERVER_PORT);

//---------------------------------------------------------------------------------------------------------------//

router.get('/speech', (req, res) => {
    res.set({'Content-Type':'audio/mpeg'});
    const speak_type = req.query.type ?? 'google'; // google | ibm
    const speak_lang = req.query.lang ?? (speak_type === 'ibm' ? 'en-US_AllisonV3Voice' : 'en-us');
    const speak_msg = req.query.text ?? 'hello world';
    if (speak_type === 'google') {
        gtts(speak_lang).stream(speak_msg).pipe(res);
    } else if (speak_type === 'ibm') {
        request.get(`${process.env.IBM_TTS_API_URL}?voice=${encodeURI(speak_lang)}&text=${encodeURI(speak_msg)}&download=true&accept=audio%2Fmp3`).pipe(res);
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/ytinfo', async (req, res) => {
    res.set({'Content-Type':'application/json'});
    if (req.query.video_id) {
        console.log(`video_id:`, req.query.video_id);
        console.time(`ytdl.getBasicInfo: yt_info`);
        let yt_info;
        try {
            yt_info = await ytdl.getBasicInfo(`https://youtu.be/${req.query.video_id}`);
        } catch (error) {
            console.trace(error);
            yt_info = {};
        } finally {
            console.timeEnd(`ytdl.getBasicInfo: yt_info`);
            res.send(JSON.stringify(yt_info, null, 2));
        }
    } else {
        res.send(JSON.stringify({
            'status':'200',
            'message':'Expected parameter \'video_id\' in the query!'
        }, null, 4));
    }
});

router.get('/ytdl', async (req, res) => {
    res.set({'Content-Type':'audio/mpeg'});
    if (req.query.url) {
        try {
            const ytdl_stream_id = `${pseudoUniqueId()}`;

            const ytdl_stream = ytdl(req.query.url, {
                'lang':'en',
                'quality':'highestaudio',
                'filter':'audioonly',
                'highWaterMark':1<<25 // 32 MB
            });

            console.log(`Started Response Stream: ${ytdl_stream_id} - ${req.query.url}`);
            const res_stream = ytdl_stream.pipe(res);
            res_stream.on('error', error => {
                console.error(`----------------------------------------------------------------------------------------------------------------`);
                console.trace(error);
                console.error(`----------------------------------------------------------------------------------------------------------------`);
            });
            res_stream.on('finish', () => {
                console.log(`Finished Response Stream: ${ytdl_stream_id} - ${req.query.url}`);
            });
        } catch (error) {
            console.trace(`Failed to stream: ${req.query.url}`, error);
        }
    } else {
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'200',
            'message':'Expected parameter \'url\' in the query!'
        }, null, 4));
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/translate', (req, res) => {
    res.set({'Content-Type':'application/json'});
    const original_text = req.query.text ?? '';
    const translate_to = req.query.translate_to ?? 'en';
    translate(original_text, {to:translate_to}).then(translated_text => {
        res.send(JSON.stringify({
            'original_lang':`auto-detect`,
            'original_text':`${original_text}`,
            'translated_lang':`${translate_to}`,
            'translated_text':`${translated_text}`
        }, null, 4));
    }).catch(console.log);
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/spmock', (req, res) => {
    res.set({'Content-Type':'application/json'});
    const original_text = req.query.text ?? '';
    const spmock_text = spmock.spmock(original_text);
    res.send(JSON.stringify({
        'original_text':`${original_text}`,
        'spmock_text':`${spmock_text}`
    }, null, 4));
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