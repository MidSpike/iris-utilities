//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from '@root/types/index';

import process from 'node:process';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { sendWebhookMessage } from '@root/common/app/webhook';

//------------------------------------------------------------//

const logging_webhook_url = process.env.DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK as string;
if (!logging_webhook_url?.length) throw new TypeError('DISCORD_BOT_CENTRAL_LOGGING_GUILD_RETENTION_WEBHOOK is not defined');

//------------------------------------------------------------//

const event_name = Discord.Events.GuildCreate;
export default {
    name: event_name,
    async handler(
        discord_client,
        guild,
    ) {
        if (!discord_client.isReady()) return;

        const current_timestamp = `${Date.now()}`.slice(0, -3);

        const guild_icon_url = guild.iconURL({ forceStatic: false, size: 4096 });

        try {
            sendWebhookMessage(logging_webhook_url, {
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.GREEN,
                        fields: [
                            {
                                name: 'Guild',
                                value: `\`${guild.name}\``,
                                inline: true,
                            }, {
                                name: 'Snowflake',
                                value: `\`${guild.id}\``,
                                inline: true,
                            }, {
                                name: 'Added On',
                                value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                            },
                        ],
                        ...(guild_icon_url ? {
                            thumbnail: {
                                url: guild_icon_url,
                            },
                        } : {}),
                    }).toJSON(),
                ],
            });
        } catch (error) {
            console.trace(error);
        }

        const client_application = await discord_client.application.fetch();
        const client_application_description = client_application.description ?? 'Failed to fetch application description.';
        const client_application_commands = await client_application.commands.fetch();

        const help_command_id: string = client_application_commands.find((cmd) => cmd.name === 'help')?.id ?? '0';
        const info_command_id: string = client_application_commands.find((cmd) => cmd.name === 'info')?.id ?? '0';
        const play_command_id: string = client_application_commands.find((cmd) => cmd.name === 'play')?.id ?? '0';
        const tts_command_id: string = client_application_commands.find((cmd) => cmd.name === 'tts')?.id ?? '0';

        const welcome_message_embed = CustomEmbed.from({
            color: CustomEmbed.colors.BRAND,
            title: 'Hello world, let\'s get started!',
            description: [
                'Thank you for adding me to this server!',
                '',
                '**About Me**',
                '\`\`\`',
                client_application_description,
                '\`\`\`',
                '',
                '**Check out some of my commands:**',
                `- </help:${help_command_id}> - view a list of all of my commands`,
                `- </info:${info_command_id}> - find out some nerdy info about me`,
                `- </play:${play_command_id}> - play audio from the internet`,
                `- </tts:${tts_command_id}> - listen to text to speech`,
            ].join('\n'),
        });

        const welcome_message_components = [
            new Discord.ActionRowBuilder<Discord.MessageActionRowComponentBuilder>().setComponents([
                new Discord.ButtonBuilder()
                    .setStyle(Discord.ButtonStyle.Link)
                    .setLabel('Website')
                    .setURL('https://iris-utilities.com/'),
                new Discord.ButtonBuilder()
                    .setStyle(Discord.ButtonStyle.Link)
                    .setLabel('Source Code')
                    .setURL('https://github.com/MidSpike/iris-utilities'),
                new Discord.ButtonBuilder()
                    .setStyle(Discord.ButtonStyle.Link)
                    .setLabel('Privacy Policy')
                    .setURL('https://iris-utilities.com/pages/privacy.html'),
            ]),
        ];

        let welcome_channel: Discord.TextChannel | null | undefined = guild.publicUpdatesChannel ?? guild.systemChannel;
        if (!welcome_channel) {
            // attempt to find any viable channel

            const all_guild_channels = await guild.channels.fetch();
            if (all_guild_channels.size < 1) return;

            const filtered_guild_channels = all_guild_channels.filter(
                (channel): channel is Discord.TextChannel => channel?.type === Discord.ChannelType.GuildText
            );

            const first_guild_channel = filtered_guild_channels.first();

            welcome_channel = first_guild_channel;
        }

        if (welcome_channel) {
            try {
                await welcome_channel.send({
                    embeds: [
                        welcome_message_embed,
                    ],
                    components: welcome_message_components,
                });
            } catch (error) {
                console.trace(error);
            }
        }

        const guild_owner = await discord_client.users.fetch(guild.ownerId);
        if (guild_owner) {
            const guild_owner_dm_channel = await guild_owner.createDM();
            if (!guild_owner_dm_channel) return;

            try {
                await guild_owner_dm_channel.send({
                    embeds: [
                        welcome_message_embed,
                        CustomEmbed.from({
                            color: CustomEmbed.colors.BRAND,
                            title: 'Why did I receive this message?',
                            description: [
                                `You are the owner of the server: ${guild.name}; and I was recently added to it.`,
                                'This message was sent to keep you informed that a new bot was added to your server.',
                                'You can remove me at any time by using the Integrations page in your server\'s settings.',
                            ].join('\n'),
                        }),
                    ],
                    components: welcome_message_components,
                });
            } catch (error) {
                console.trace(error);
            }
        }
    },
} as ClientEventExport<typeof event_name>;
