'use strict';

//#region local dependencies
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment-timezone');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'MINECRAFT_SEARCH',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 8,
    description: 'search minecraft for user / server info',
    aliases: ['minecraft_search', 'mc_search'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (['user'].includes(command_args[0])) {
            const search_query = command_args.slice(2).join(' ');

            const mc_user_api_response = await axios.get(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(search_query)}`).catch(() => {});
            const mc_user_api_response_data = mc_user_api_response?.data;

            const mc_user_uuid = mc_user_api_response_data?.data?.player?.id;
            const mc_user_username = mc_user_api_response_data?.data?.player?.username;
            const mc_user_name_history = mc_user_api_response_data?.data?.player?.meta?.name_history;

            function mc_user_exists() {
                if (!mc_user_uuid) {
                    message.channel.send(new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: `Well that\'s an issue...`,
                        description: `I can\'t find a user by the name of **${Discord.Util.escapeMarkdown(search_query)}**!`,
                    }, message)).catch(console.warn);
                    return false;
                } else {
                    return true;
                }
            }

            if (['info'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_body_image = `https://crafatar.com/renders/body/${encodeURIComponent(mc_user_uuid)}?overlay=true`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    fields: [
                        {
                            name: 'Username History',
                            value: mc_user_name_history.map(entry => `- ${entry?.name} (${moment(entry?.changedToAt)})`).join('\n'),
                        },
                    ],
                    thumbnail: mc_avatar_image,
                    image: mc_body_image,
                }, message)).catch(console.warn);
            } else if (['skin'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_skin_image = `https://crafatar.com/skins/${encodeURIComponent(mc_user_uuid)}`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    thumbnail: mc_avatar_image,
                    image: mc_skin_image,
                }, message)).catch(console.warn);
            } else if (['cape'].includes(command_args[1])) {
                if (!mc_user_exists()) return;

                const mc_avatar_image = `https://crafatar.com/avatars/${encodeURIComponent(mc_user_uuid)}?overlay=true`;
                const mc_cape_image = `https://crafatar.com/capes/${encodeURIComponent(mc_user_uuid)}`;

                message.channel.send(new CustomRichEmbed({
                    title: `${mc_user_username}`,
                    description: `${mc_user_uuid}`,
                    thumbnail: mc_avatar_image,
                    image: mc_cape_image,
                }, message)).catch(console.warn);
            } else {
                message.channel.send(new CustomRichEmbed({
                    title: 'Usage details below!',
                    description: [
                        `Usage: \`${discord_command} user [ info | skin | cape ] <username>\``,
                        `Example: \`${discord_command} user info Notch\``,
                    ].join('\n'),
                }, message)).catch(console.warn);
            }
        } else if (['server'].includes(command_args[0])) {
            const search_query = command_args.slice(2).join(' ');

            const mc_server_info_api_response = await axios.get(`https://api.mcsrvstat.us/2/${encodeURIComponent(search_query)}`).catch(() => {});
            const mc_server_info_api_response_data = mc_server_info_api_response?.data;

            console.log({
                mc_server_info_api_response_data,
            });

            const mc_server_info_online = mc_server_info_api_response_data?.online;
            const mc_server_info_hostname = mc_server_info_api_response_data?.hostname;
            const mc_server_info_ip = mc_server_info_api_response_data?.ip;
            const mc_server_info_motd_clean = mc_server_info_api_response_data?.motd?.clean ?? [];
            const mc_server_info_version = mc_server_info_api_response_data?.version;
            const mc_server_info_players = mc_server_info_api_response_data?.players?.online;
            const mc_server_info_max_players = mc_server_info_api_response_data?.players?.max;

            const mc_server_info_icon = mc_server_info_api_response_data?.icon;

            function mc_server_exists() {
                if (!mc_server_info_online) {
                    message.channel.send(new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: `Well that\'s an issue...`,
                        description: `I can\'t find any minecraft server by the ip of **${Discord.Util.escapeMarkdown(search_query)}**!`,
                    }, message)).catch(console.warn);
                    return false;
                } else {
                    return true;
                }
            }

            if (['info'].includes(command_args[1])) {
                if (!mc_server_exists()) return;

                const mc_server_info_icon_temp_file_name = `mc-icon-${Date.now()}.png`;
                const mc_server_info_icon_temp_file_path = path.join(process.cwd(), 'temporary', `${mc_server_info_icon_temp_file_name}`);

                const mc_server_info_icon_base_64 = mc_server_info_icon.split(',')[1];
                const mc_server_info_icon_buffer = Buffer.from(mc_server_info_icon_base_64, 'base64');

                fs.writeFileSync(mc_server_info_icon_temp_file_path, mc_server_info_icon_buffer, { flag: 'w+' });

                await message.channel.send({
                    embed: new CustomRichEmbed({
                        title: `${mc_server_info_hostname ?? mc_server_info_ip} (${mc_server_info_hostname ? mc_server_info_ip : ''})`,
                        description: `${mc_server_info_motd_clean.map(motd_line => motd_line.trim()).join('\n')}`,
                        fields: [
                            {
                                name: 'Version',
                                value: `${mc_server_info_version}`,
                            }, {
                                name: 'Online Players',
                                value: `${mc_server_info_players}`,
                            }, {
                                name: 'Maximum Players',
                                value: `${mc_server_info_max_players}`,
                            },
                        ],
                        thumbnail: `attachment://${mc_server_info_icon_temp_file_name}`,
                    }, message),
                    files: [
                        {
                            attachment: mc_server_info_icon_temp_file_path,
                            name: mc_server_info_icon_temp_file_name,
                        },
                    ],
                }).catch(console.warn);

                fs.unlinkSync(mc_server_info_icon_temp_file_path);
            } else {
                message.channel.send(new CustomRichEmbed({
                    title: 'Usage details below!',
                    description: [
                        `Usage: \`${discord_command} server [ info ] <server_ip>\``,
                        `Example: \`${discord_command} server info hypixel.net\``,
                    ].join('\n'),
                }, message)).catch(console.warn);
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title: 'Usage details below!',
                description: `Usage: \`${discord_command} [ user | server ]\``,
            }, message)).catch(console.warn);
        }
    },
});
