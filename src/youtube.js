'use strict';

require('dotenv').config();

const { Timer } = require('../utilities.js');

const youtubeSearch = require('youtube-search');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches YouTube using the YT API and returns an array of search results
 * @param {String} search_query video, url, etc to look up on youtube
 * @param {Number} max_results 
 * @param {Number} retry_attempts 
 * @returns {Array<Object>|undefined}
 */
async function forceYouTubeSearch(search_query, max_results=5, retry_attempts=3) {
    if (typeof search_query !== 'string') throw new TypeError('`search_query` must be a string!');
    if (isNaN(max_results)) throw new TypeError('`max_results` must be a number!');
    if (Math.floor(max_results) !== max_results || max_results < 1) throw RangeError('`max_results` must be a whole number and at least `1`!');
    if (isNaN(retry_attempts)) throw new TypeError('`retry_attempts` must be positive whole number above zero!');
    if (Math.floor(retry_attempts) !== retry_attempts || retry_attempts < 1) throw RangeError('`retry_attempts` must be a whole number and at least `1`!');

    let current_search_attempt = 1;
    let search_results;
    while (current_search_attempt <= retry_attempts) {
        try {
            const { results } = await youtubeSearch(search_query, {
                maxResults: max_results,
                type: 'video',
                regionCode: 'US',
                key: process.env.YOUTUBE_API_TOKEN
            });
            search_results = results ?? []; // Force an empty array if nullish
        } catch (error) {
            console.trace(error);
            throw error;
        } finally {
            if (search_results.length > 0) break;
            else current_search_attempt++;
            await Timer(1000 + current_search_attempt * 250);
        }
    }
    return search_results ?? []; // Force an empty array if nullish
}


module.exports = {
    forceYouTubeSearch,
};
