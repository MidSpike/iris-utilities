'use strict';

const os = require('os'); os.setPriority(0, os.constants.priority.PRIORITY_HIGH);
const fs = require('fs');

const request = require('request');
const express = require('express');
const router = express.Router();

const translate = require('translate-google');

const spmock = require('spmock');

const gtts = require('node-gtts');
const ytdl = require('ytdl-core');

const ytSearch = require('yt-search');

const youtubeSearch = require('youtube-search');

//---------------------------------------------------------------------------------------------------------------//

const ytSearchAsync = (search_query) => new Promise((resolve, reject) => {
    if (search_query) {
        ytSearch(search_query, (error, result) => {
            if (error) {
                resolve(error);
            } else if (result.videos.length === 0) {
                resolve(new Error('could not find a video'));
            } else {
                result.videos = result.videos.filter(video => video.videoId !== 'L&ai'); // remove ads from the results
                resolve(result.videos[0].videoId);
            }
        });
    } else {
        resolve(new Error('search_query not defined'));
    }
});

//---------------------------------------------------------------------------------------------------------------//

const app = express();
app.set('port', process.env.BOT_SERVER_PORT);

//---------------------------------------------------------------------------------------------------------------//

router.get('/speech', (req, res) => {
    res.set({'Content-Type':'audio/mpeg'});
    const speak_type = req.query.type ?? 'google'; // google | ibm
    const speak_lang = req.query.lang ?? (speak_type === 'ibm' ? 'en-US_AllisonV3Voice' : 'en-us');
    const speak_msg = req.query.text ?? 'hello world';
    if (speak_type === 'google') {
        gtts(speak_lang).stream(speak_msg).pipe(res);
    } else if (speak_type === 'ibm') {
        request.get(`https://text-to-speech-demo.ng.bluemix.net/api/v3/synthesize?voice=${encodeURI(speak_lang)}&text=${encodeURI(speak_msg)}&download=true&accept=audio%2Fmp3`).pipe(res);
    }
});

//---------------------------------------------------------------------------------------------------------------//

router.get('/ytsearch', (req, res) => {
    res.set({'Content-Type':'application/json'});
    if (req.query.search) {
        youtubeSearch(req.query.search, {maxResults:(req.query.max ?? 5), type:'video', regionCode:'US', key:process.env.YOUTUBE_API_TOKEN}, (error, results) => {
            if (error) {
                console.error(error);
                res.send(JSON.stringify({
                    'status':'200',
                    'message':`${error}`
                }, null, 4));
            } else {
                res.send(JSON.stringify(results, null, 4));
            }
        });
    } else {
        res.send(JSON.stringify({
            'status':'200',
            'message':'Expected parameter \'search\' in the query!'
        }, null, 4));
    }
});
router.get('/ytinfo', (req, res) => {
    res.set({'Content-Type':'application/json'});
    if (req.query.video_id) {
        ytdl.getBasicInfo(`https://youtu.be/${req.query.video_id}`).then(yt_info => {
            const infos = {
                hl:yt_info.hl,
                player_response:yt_info.player_response,
                // video_info:yt_info.player_response.videoDetails,
                author:yt_info.author,
                published:yt_info.published,
                related_videos:yt_info.related_videos,
                likes:yt_info.likes,
                dislikes:yt_info.dislikes,
                video_id:yt_info.video_id,
                video_url:yt_info.video_url,
                title:yt_info.title,
                length_seconds:yt_info.length_seconds,
                age_restricted:yt_info.age_restricted
            };
            delete infos.player_response.streamingData;
            delete infos.player_response.playerAds;
            delete infos.player_response.playerConfig;
            delete infos.player_response.playbackTracking;
            delete infos.player_response.storyboards;
            delete infos.player_response.microformat;
            delete infos.player_response.trackingParams;
            delete infos.player_response.attestation;
            delete infos.player_response.adPlacements;
            delete infos.player_response.messages;
            delete infos.player_response.videoQualityPromoSupportedRenderers;
            delete infos.player_response.videoDetails.keywords;
            delete infos.player_response.videoDetails.shortDescription;
            res.send(JSON.stringify(infos, null, 4));
        });
    } else {
        res.send(JSON.stringify({
            'status':'200',
            'message':'Expected parameter \'video_id\' in the query!'
        }, null, 4));
    }
});

router.get('/ytdl', async (req, res) => {
    res.set({'Content-Type':'audio/mpeg'});
    const highWaterMark = 1<<25; // 32mb
    if (req.query.url) {
        try {
            console.log(`Attempting to stream: ${req.query.url}`);
            // const ytdl_stream = ytdl(req.query.url, {filter:'audioonly', liveBuffer:60000, highWaterMark:highWaterMark});
            const ytdl_stream = ytdl(req.query.url, {lang:'en', quality:'highestaudio', filter:'audioonly', highWaterMark:highWaterMark});
            ytdl_stream.on('error', error => {
                console.error(`----------------------------------------------------------------------------------------------------------------`);
                console.trace(error);
                console.error(`----------------------------------------------------------------------------------------------------------------`);
            });
            ytdl_stream.pipe(res);
        } catch (error) {
            console.log(`Failed to stream: ${req.query.url}`);
            console.trace(error);
        }
    } else if (req.query.search) {
        const yt_video_id = await ytSearchAsync(req.query.search);
        if (yt_video_id instanceof Error) {
            gtts('en-us').stream('Video not found').pipe(res);
        } else {
            ytdl(`https://www.youtube.com/watch?v=${encodeURI(yt_video_id)}`, {filter:'audioonly', highWaterMark:highWaterMark}).pipe(res);
        }
    } else {
        res.set({'Content-Type':'application/json'});
        res.send(JSON.stringify({
            'status':'200',
            'message':'Expected parameter \'url\' or \'search\' in the query!'
        }, null, 4));
    }
});

// Used by FiveM
router.get('/ytradio', (req, res) => {
    res.set({'Content-Type':'application/ogg'});
    const highWaterMark = 1<<25; // 32mb
    ytdl(req.query?.url, {filter:'audioonly', highWaterMark:highWaterMark}).pipe(res);
});

//---------------------------------------------------------------------------------------------------------------//

// Translate
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

// Spongebob Mock
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

// Discord Bot
router.get('/bot', (req, res) => {
    res.set({'Content-Type':'text/html'});
    const ds_bot_endpoints = [
        'public-config',
        'blacklisted-users',
        'blacklisted-guilds',
    ];
    res.send([
        `<html>`,
            `<head>`,
                `<style>body {background:#000000; color:#ffffff;}</style>`,
            `</head>`,
            `<body>`,
                `<h1>Here are the available 'bot' endpoints:</h1>`,
                `<h3>${ds_bot_endpoints.map(a => `<a href="./bot/${a}" target="_blank">${a}</a>`).join('<br>')}</h3>`,
            `</body>`,
        `</html>`
    ].join('\n'));
});
router.get('/bot/public-config', (req, res) => {
    res.set({'Content-Type':'application/json'});
    const bot_public_config = JSON.parse(fs.readFileSync('./config.json'));
    res.send(JSON.stringify(bot_public_config, null, 4));
});
router.get('/bot/blacklisted-users', (req, res) => {
    res.set({'Content-Type':'application/json'});
    const blacklisted_users = JSON.parse(fs.readFileSync('./root/database/blacklisted-users.json'));
    res.send(JSON.stringify(blacklisted_users, null, 4));
});
router.get('/bot/blacklisted-guilds', (req, res) => {
    res.set({'Content-Type':'application/json'});
    const blacklisted_guilds = JSON.parse(fs.readFileSync('./root/database/blacklisted-guilds.json'));
    res.send(JSON.stringify(blacklisted_guilds, null, 4));
});

//---------------------------------------------------------------------------------------------------------------//
    
app.use('/', router);

//---------------------------------------------------------------------------------------------------------------//

module.exports = () => {
    app.listen(app.get('port'), () => {
        console.log(`----------------------------------------------------------------------------------------------------------------`);
        console.log(`Started Bot Server On Port ${app.get('port')}`);
        console.log(`----------------------------------------------------------------------------------------------------------------`);
    });
};