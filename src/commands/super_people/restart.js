'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { Timer } = require('../../utilities.js');

const { createConnection } = require('../../libs/createConnection.js');
const { playStream } = require('../../libs/playStream.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand, sendConfirmationEmbed } = require('../../libs/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

const bot_common_name = bot_config.COMMON_NAME;
const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name: 'RESTART',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'restart',
    aliases: ['restart'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts = {}) {
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'restart')) {
            sendNotAllowedCommand(message);
            return;
        }
        const num_active_voices = client.voice.connections?.size;
        const active_voice_guilds = client.voice.connections?.map((connection) => connection.channel.guild) ?? [];
        sendConfirmationEmbed(
            message.author.id,
            message.channel.id,
            false,
            new CustomRichEmbed({
                title: `Do you want to restart ${bot_common_name}`,
                description: `${num_active_voices > 0 ? '```fix\n' : ''}There ${
                    num_active_voices === 1 ? 'is' : 'are'
                } ${num_active_voices} active voice connection${num_active_voices === 1 ? '' : 's'} right now.${
                    num_active_voices > 0 ? '\n```' : ''
                }`,
                fields: [
                    {
                        name: 'Affected Guilds',
                        value:
                            active_voice_guilds.length > 0
                                ? `${'```'}\n${active_voice_guilds
                                      .map(
                                          (guild) =>
                                              `${
                                                  guild.me.voice?.channel?.members?.filter((member) => !member.user.bot)
                                                      ?.size ?? 0
                                              } - ${guild.name}`,
                                      )
                                      .join('\n')}\n${'```'}`
                                : 'N/A',
                    },
                ],
            }),
            async (bot_message) => {
                client.$.restarting_bot = true;

                const voice_channels = client.voice.connections?.map((c) => c.channel) ?? [];
                if (voice_channels.length > 0) {
                    await bot_message.edit(
                        new CustomRichEmbed({
                            title: `${bot_common_name}: Sending Restart TTS Announcement`,
                        }),
                    );

                    const tts_text_english = `My developer told me to restart for updates... Check back in 5 minutes to see if I'm finished updating.`;
                    const tts_url_english = `${bot_api_url}/speech?token=${encodeURIComponent(
                        process.env.BOT_API_SERVER_TOKEN,
                    )}&type=ibm&lang=en-GB_KateV3Voice&text=${encodeURIComponent(tts_text_english)}`;
                    const tts_broadcast_english = client.voice.createBroadcast();
                    tts_broadcast_english.play(tts_url_english);
                    for (let vc of voice_channels) {
                        if (!vc) return;
                        playStream(await createConnection(vc, true), tts_broadcast_english, 5.0);
                    }
                    await Timer(10000); // let TTS do its thing first

                    const tts_text_spanish = `Mi desarrollador me dijo que reiniciara las actualizaciones ... Vuelva en 5 minutos para ver si he terminado de actualizar.`;
                    const tts_url_spanish = `${bot_api_url}/speech?token=${encodeURIComponent(
                        process.env.BOT_API_SERVER_TOKEN,
                    )}&type=ibm&lang=es-LA_SofiaV3Voice&text=${encodeURIComponent(tts_text_spanish)}`;
                    const tts_broadcast_spanish = client.voice.createBroadcast();
                    tts_broadcast_spanish.play(tts_url_spanish);
                    for (let vc of voice_channels) {
                        if (!vc) return;
                        playStream(await createConnection(vc, false), tts_broadcast_spanish, 5.0);
                    }
                    await Timer(15000); // let TTS do its thing first

                    const tts_text_german = `Mein Entwickler sagte mir, ich solle für Updates neu starten ... Überprüfen Sie in 5 Minuten erneut, ob ich mit dem Update fertig bin.`;
                    const tts_url_german = `${bot_api_url}/speech?token=${encodeURIComponent(
                        process.env.BOT_API_SERVER_TOKEN,
                    )}&type=ibm&lang=de-DE_DieterV3Voice&text=${encodeURIComponent(tts_text_german)}`;
                    const tts_broadcast_german = client.voice.createBroadcast();
                    tts_broadcast_german.play(tts_url_german);
                    for (let vc of voice_channels) {
                        if (!vc) return;
                        playStream(await createConnection(vc, false), tts_broadcast_german, 5.0);
                    }
                    await Timer(13000); // let TTS do its thing first

                    const tts_text_japanese = `開発者からアップデートを再開するように言われました... 5分後にもう一度チェックして、アップデートが終了したかどうかを確認してください。`;
                    const tts_url_japanese = `${bot_api_url}/speech?token=${encodeURIComponent(
                        process.env.BOT_API_SERVER_TOKEN,
                    )}&type=ibm&lang=ja-JP_EmiV3Voice&text=${encodeURIComponent(tts_text_japanese)}`;
                    const tts_broadcast_japanese = client.voice.createBroadcast();
                    tts_broadcast_japanese.play(tts_url_japanese);
                    for (let vc of voice_channels) {
                        if (!vc) return;
                        playStream(await createConnection(vc, false), tts_broadcast_japanese, 5.0);
                    }
                    await Timer(25000); // let TTS do its thing first
                }

                await bot_message.edit(
                    new CustomRichEmbed({
                        title: `${bot_common_name}: Started Restart Process`,
                    }),
                );

                await Timer(500);
                client.destroy(); // destroy the client instance
                await Timer(500);

                process.exit(0); // restart the bot by killing the process
            },
            async (bot_message) => {
                await bot_message.delete({ timeout: 500 });
                await bot_message.channel.send(
                    new CustomRichEmbed({
                        title: `${bot_common_name}: Canceled Restarting`,
                    }),
                );
            },
        );
    },
});
