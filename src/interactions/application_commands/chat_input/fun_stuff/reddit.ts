//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { stringEllipses } from '@root/common/lib/utilities';

import { CustomEmbed, disableMessageComponents, requestPotentialNotSafeForWorkContentConsent } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

type PartialRedditSubredditAutocompleteApiResponse = {
    data: {
        children: {
            data: {
                display_name: string; // Example: 'subreddit'
                display_name_prefixed: string; // Example: 'r/subreddit'
                title: string; // Example: '/r/subreddit - An example subreddit'
                subscribers?: number; // The number of subscribers
            };
        }[];
    };
};

type PartialRedditSubredditPostsApiResponse = {
    data: {
        children: {
            data: {
                url: string; // The url of the post
                title: string; // The title of the post
                author: string; // The username of the author
                selftext?: string; // The content of the post
                preview?: {
                    images: {
                        source: {
                            url: string; // The url of the image
                        }
                    }[];
                    reddit_video_preview?: {
                        fallback_url: string; // The reliable url of the video
                    };
                };
            };
        }[];
    };
};

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'reddit',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        description: 'searches a specified subreddit for posts',
        type: Discord.ApplicationCommandType.ChatInput,
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'subreddit',
                description: 'the subreddit to search',
                autocomplete: true,
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'sort_by',
                description: 'how to sort the results',
                required: false,
                choices: [
                    {
                        name: 'Hot',
                        value: 'hot',
                    }, {
                        name: 'New',
                        value: 'new',
                    }, {
                        name: 'Top',
                        value: 'top',
                    }, {
                        name: 'Rising',
                        value: 'rising',
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.FUN_STUFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;

        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const query_option = interaction.options.getFocused(true);

            if (query_option.name !== 'subreddit') return;

            if (query_option.value.length < 1) {
                interaction.respond([]);

                return;
            }

            const subreddit_results = await axios({
                method: 'get',
                url: `https://www.reddit.com/api/subreddit_autocomplete_v2.json?${new URLSearchParams({
                    'raw_json': '1', // returns json instead of html
                    'limit': '10', // 10 is the maximum allowed by reddit
                    'include_over_18': 'true', // Include subreddits that are NSFW
                    'typeahead_active': 'true', // this enables fuzzy matching
                    'include_profiles': 'false', // removes unneeded data
                    'query': query_option.value,
                })}`,
                validateStatus: (status_code) => status_code === 200,
            }).then((response) => response.data) as PartialRedditSubredditAutocompleteApiResponse ?? {};

            if (subreddit_results.data.children.length < 1) {
                interaction.respond([]);

                return;
            }

            interaction.respond(
                subreddit_results.data.children.sort(
                    (a, b) => (b.data.subscribers ?? 0) - (a.data.subscribers ?? 0),
                ).map((subreddit_result) => ({
                    name: stringEllipses(`${subreddit_result.data.display_name_prefixed} - ${subreddit_result.data.title}`, 100),
                    value: stringEllipses(`${subreddit_result.data.display_name}`, 100),
                })).slice(0, 5) // show only 5 results
            );

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const user_consents_to_potential_nsfw = await requestPotentialNotSafeForWorkContentConsent(interaction.channel!, interaction.user);
        if (!user_consents_to_potential_nsfw) return await interaction.deleteReply();

        const bot_initial_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Reddit > Loading...',
                }),
            ],
        });

        const subreddit_option_value = interaction.options.getString('subreddit', true);
        const sort_by_option_value = interaction.options.getString('sort_by', false) ?? 'hot';

        const subreddit_posts_results = await axios({
            method: 'get',
            url: `https://www.reddit.com/r/${subreddit_option_value}/${sort_by_option_value}.json?${new URLSearchParams({
                'raw_json': '1', // returns json instead of html
                'limit': '25', // maximum is 100
            })}`,
            validateStatus: (status_code) => status_code === 200,
        }).then((response) => response.data as PartialRedditSubredditPostsApiResponse).catch(() => undefined);

        if (!subreddit_posts_results || subreddit_posts_results.data.children.length < 1) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        title: 'No results found',
                        description: 'Please try again with a different subreddit',
                    }),
                ],
            });

            return;
        }

        type MappedSubredditPost = {
            url: string;
            title: string;
            author_name: string;
            author_url: string;
            content?: string | undefined;
            preview_image_url?: string | undefined;
            preview_video_url?: string | undefined;
        };

        const mapped_subreddit_posts: MappedSubredditPost[] = subreddit_posts_results.data.children.map((subreddit_post) => ({
            url: subreddit_post.data.url,
            title: subreddit_post.data.title,
            author_name: subreddit_post.data.author,
            author_url: `https://reddit.com/u/${subreddit_post.data.author}`,
            content: subreddit_post.data.selftext,
            preview_image_url: subreddit_post.data.preview?.images?.at(0)?.source?.url,
            preview_video_url: subreddit_post.data.preview?.reddit_video_preview?.fallback_url,
        }));

        let current_page: number = 0;

        async function generateMessagePayload(
            mapped_subreddit_post: MappedSubredditPost,
        ): Promise<Discord.WebhookMessageEditOptions> {
            return {
                embeds: [
                    CustomEmbed.from({
                        author: {
                            icon_url: 'https://cdn.midspike.com/projects/iris/reddit-logo.png',
                            name: `r/${subreddit_option_value}`,
                        },
                        title: mapped_subreddit_post.title,
                        ...(mapped_subreddit_post.content?.length ? {
                            description: Discord.escapeMarkdown(
                                stringEllipses(
                                    mapped_subreddit_post.content,
                                    1024,
                                    `... [Continue reading on reddit](${mapped_subreddit_post.url})`
                                ),
                            ),
                        } : {}),
                        fields: [
                            {
                                name: 'Link',
                                value: `[View on Reddit](${mapped_subreddit_post.url})`,
                                inline: true,
                            }, {
                                name: 'Author',
                                value: `[${mapped_subreddit_post.author_name}](${mapped_subreddit_post.author_url})`,
                                inline: true,
                            },
                            ...(mapped_subreddit_post.preview_image_url ? [
                                {
                                    name: 'Image',
                                    value: `[link](${mapped_subreddit_post.preview_image_url})`,
                                    inline: true,
                                },
                            ] : []),
                            ...(mapped_subreddit_post.preview_video_url ? [
                                {
                                    name: 'Video',
                                    value: `[link](${mapped_subreddit_post.preview_video_url})`,
                                    inline: true,
                                },
                            ] : []),
                        ],
                        ...(mapped_subreddit_post.preview_image_url ? {
                            image: {
                                url: mapped_subreddit_post.preview_image_url,
                            },
                        }: {}),
                    }),
                ],
                components: [
                    {
                        type: Discord.ComponentType.ActionRow,
                        components: [
                            {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Secondary,
                                customId: 'reddit_button__previous',
                                label: 'Previous',
                            }, {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Secondary,
                                customId: 'reddit_button__next',
                                label: 'Next',
                            }, {
                                type: Discord.ComponentType.Button,
                                style: Discord.ButtonStyle.Danger,
                                customId: 'reddit_button__end_session',
                                label: 'End Session',
                            },
                        ],
                    },
                ],
            };
        }

        const subreddit_post = mapped_subreddit_posts.at(current_page)!;

        await interaction.editReply(await generateMessagePayload(subreddit_post));

        const button_interaction_collector = bot_initial_message.createMessageComponentCollector({
            time: 5 * 60_000, // 5 minutes
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            if (!(button_interaction.message instanceof Discord.Message)) return;

            if (button_interaction.user.id !== interaction.user.id) {
                await button_interaction.followUp({
                    ephemeral: true,
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            description: `${button_interaction.user}, don\'t interfere with ${interaction.user}\'s Reddit session!`,
                        }),
                    ],
                });

                return;
            }

            switch (button_interaction.customId) {
                case 'reddit_button__previous': {
                    if (current_page === 0) break;

                    current_page -= 1;

                    break;
                }

                case 'reddit_button__next': {
                    if (current_page === mapped_subreddit_posts.length - 1) break;

                    current_page += 1;

                    break;
                }

                case 'reddit_button__end_session': {
                    button_interaction_collector.stop('reddit_button__end_session');

                    break;
                }

                default: {
                    return;
                }
            }

            const subreddit_post = mapped_subreddit_posts.at(current_page)!;

            await button_interaction.editReply(await generateMessagePayload(subreddit_post));

            button_interaction_collector.resetTimer();
        });

        button_interaction_collector.on('end', async (collected_interactions, reason) => {
            const most_recent_interaction = collected_interactions.last();

            if (!most_recent_interaction) return;
            if (!most_recent_interaction.inCachedGuild()) return;

            if (reason === 'reddit_button__end_session') {
                await most_recent_interaction.deleteReply();

                return;
            }

            await disableMessageComponents(most_recent_interaction.message);
        });
    },
});
