'use strict';

//#region local dependencies
const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { QueueItem, QueueItemPlayer } = require('../../libs/QueueManager.js');
const { createConnection } = require('../../libs/createConnection.js');
//#endregion local dependencies

const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name:'TTS_ARGUMENT',
    category:`${DisBotCommander.categories.HIDDEN}`,
    description:'TTS argument',
    aliases:['tts_argument'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const used_insults = [];
        let insult_count = 1;
        async function tts_insult() {
            if (!message.member.voice?.channel) return;

            const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

            let insult;

            do {
                insult = (await axios.get(`https://evilinsult.com/generate_insult.php?lang=en&type=json`))?.data;
                await Timer(500);
            } while (used_insults.includes(insult.number))

            used_insults.push(insult.number);

            const tts_person = Boolean(insult_count & 1); // true | false

            const tts_provider = 'ibm';
            const tts_voice = tts_person ? 'en-GB_KateV3Voice' : 'en-US_HenryV3Voice';
            const tts_text = `${insult.insult}`;

            const tts_url = `${bot_api_url}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${encodeURIComponent(tts_provider)}&lang=${encodeURIComponent(tts_voice)}&text=${encodeURIComponent(tts_text)}`;

            const voice_connection = await createConnection(message.member.voice.channel, false);

            const stream_maker = () => tts_url;
            const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 10.0, undefined, () => {
                if (!message.guild.me.voice?.channel) return;
                insult_count++;
                tts_insult();
            });

            await guild_queue_manager.addItem(new QueueItem('tts', player, `TTS Message`, {
                text: `${tts_text}`,
                provider: `${tts_provider}`,
                voice: `${tts_voice}`
            }));

            message.channel.send(new CustomRichEmbed({
                title:'Added TTS Insult To The Queue!'
            }));
        }
        tts_insult();
    },
});
