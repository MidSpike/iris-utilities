'use strict';

//#region local dependencies
const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { logUserError } = require('../../libs/errors.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { QueueItem,
        QueueItemPlayer } = require('../../libs/QueueManager.js');
const { createConnection } = require('../../libs/createConnection.js');
//#endregion local dependencies

const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name: 'TTS_ARGUMENT',
    category: `${DisBotCommander.categories.HIDDEN}`,
    description: 'have two TTS voices insult each other automatically',
    aliases: ['tts_argument', 'tts_insults'],
    access_level: DisBotCommand.access_levels.GLOBAL_USER,
    async executor(Discord, client, message, opts={}) {
        const used_insults = [];
        let insult_count = 1;
        async function tts_insult() {
            if (!message.member.voice?.channel) {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Woah there!',
                    description: 'You need to be in a voice channel to use this command!',
                }));
                return;
            }
            if (!message.guild.me.voice?.channel && insult_count > 1) return;

            const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

            let insult;
            do {
                let evil_insult_api_response;
                try {
                    evil_insult_api_response = await axios.get(`https://evilinsult.com/generate_insult.php?lang=en&type=json`)
                } catch (error) {
                    logUserError(message, error);
                    return;
                }
                insult = evil_insult_api_response.data;
                await Timer(250); // prevent api abuse
            } while (used_insults.includes(insult.number))

            const tts_person = Boolean(insult_count & 1); // true | false

            const tts_provider = 'ibm';
            const tts_voice = tts_person ? 'en-GB_KateV3Voice' : 'en-US_HenryV3Voice';
            const tts_text = `${insult.insult}`;

            const tts_url = `${bot_api_url}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${encodeURIComponent(tts_provider)}&lang=${encodeURIComponent(tts_voice)}&text=${encodeURIComponent(tts_text)}`;

            const voice_connection = await createConnection(message.member.voice.channel, false);

            const stream_maker = () => tts_url;

            const queue_item_player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 15.0, undefined, () => {
                insult_count++;
                if (insult_count < 25) {
                    tts_insult();
                } else {
                    message.channel.send(new CustomRichEmbed({
                        title: 'Reached 25 TTS insults!',
                        description: 'Automatically stopping the TTS insult generator!',
                    }));
                }
            });

            await guild_queue_manager.addItem(new QueueItem('tts', queue_item_player, `TTS Insult`, {
                text: `${tts_text}`,
                provider: `${tts_provider}`,
                voice: `${tts_voice}`,
            }));

            message.channel.send(new CustomRichEmbed({
                title: 'Added TTS Insult To The Queue!',
            }));
        }
        tts_insult();
    },
});
