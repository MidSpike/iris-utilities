'use strict';

//---------------------------------------------------------------------------------------------------------------//

const { Collection } = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * The version displayed to users in informative contexts
 * 
 * scheme:
 * - v[status][year]-[month]-[day]_[semi-version]
 * 
 * status:
 * - S = Stable
 * - U = Unstable (don't use in production)
 * 
 * year-month-day:
 * - based on the US-EAST timezone
 * 
 * semi-version:
 * - used to denote minor patches to an already released PUBLIC_VERSION
 */
const PUBLIC_VERSION = 'vS_2021-01-20_0';

/**
 * The various names given to this bot matching the schemes below
 */
const SHORT_NAME = 'IRIS'; // must match the following scheme [ a-z | A-Z | 0-9 | - | _ ]
const COMMON_NAME = 'I.R.I.S. Utilities'; // to be used in sentences
const LONG_NAME = 'Interactive Reconnaissance Information Service Utilities'; // a cool acronym to give this bot

/**
 * The owner of this bot
 */
const OWNER_ID = '163646957783482370';

/**
 * The website for this bot
 */
const WEBSITE = 'https://iris-utilities.com/';

/**
 * The GitHub / Repository location for this bot
 */
const GITHUB = 'https://github.com/MidSpike/iris-utilities';

/**
 * Donation sources are ways to donate to the creator of this bot
 */
const DONATION_SOURCES = {
    GITHUB: 'https://github.com/sponsors/MidSpike',
    PAYPAL: 'https://paypal.me/midspike',
    PATREON: 'https://www.patreon.com/midspike',
};

/**
 * Special Channels are channels used for logging and various other groupings of this bot's functionality
 */
const SPECIAL_CHANNELS = [
    {
        id: 'ARCHIVED_CHANNELS_CATEGORY',
        type: 'category',
        name: 'iris-archived-channels',
        description: 'This category is used for organizing archived channels.',
    }, {
        id: 'SPECIAL_CHANNELS_CATEGORY',
        type: 'category',
        name: 'I.R.I.S. Utilities',
        description: 'This category is used for organizing the special channels.',
    }, {
        id: 'BOT_COMMANDS',
        type: 'text',
        name: 'iris-bot-commands',
        description: 'This channel is used as a backup-method for using this bot when the \'set_allowed_channels\' is improperly used.',
    }, {
        id: 'BOT_RESTARTS',
        type: 'text',
        name: 'iris-restart-log',
        description: 'This channel will log when this bot restarts.',
    }, {
        id: 'BOT_UPDATES',
        type: 'text',
        name: 'iris-update-log',
        description: 'This channel will show update messages and announcements from the Support Staff for this bot!',
    }, {
        id: 'GUILD_COMMANDS',
        type: 'text',
        name: 'iris-command-log',
        description: 'This channel logs all of the commands (for this bot) entered by members in this guild.',
    }, {
        id: 'GUILD_MEMBERS',
        type: 'text',
        name: 'iris-member-log',
        description: 'This channel will send join/leave messages like Discord\'s default \'System Channel\' logging.',
    }, {
        id: 'GUILD_INVITES',
        type: 'text',
        name: 'iris-invite-log',
        description: 'This channel will log invites that are created/destroyed by members in this guild.',
    }, {
        id: 'GUILD_MODERATION',
        type: 'text',
        name: 'iris-moderation-log',
        description: 'This channel is used to log when the bot\'s mod/admin commands have been used in this guild.',
    }, {
        id: 'GUILD_REACTIONS',
        type: 'text',
        name: 'iris-reaction-log',
        description: 'This channel keeps track of reactions that are manipulated by users in this guild.',
    },
];

/**
 * Whitelisted Control Bots are bots that are permitted to execute commands / actions through this bot as if they were a user
 */
const WHITELISTED_CONTROL_BOTS = [
    '779812072170455050', // I.R.I.S. Alexa Hook (owned by: 163646957783482370)
];

/**
 * Super Perms are the acceptable permission values for Super People
 */
const SUPER_PERMS = [
    '*',
    'evaluate_code',
    'restart',
    'reload',
    'blacklist',
    'guild_super_user',
    'get_guild',
    'delete_messages',
    'dm',
    'echo',
    'super_volume',
];

/**
 * Super People are "Admins" of this bot and have elevated permissions
 * The `public` property is used to denote whether or not to display the user as a "Super Person" in informative contexts
 */
const SUPER_PEOPLE = new Collection([
    {
        id: '163646957783482370',
        name: 'MidSpike',
        public: false,
        allowed_permissions: ['*'],
        denied_permissions: [],
    }, {
        id: '255071492801429504',
        name: 'QuackAttack',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: [],
    }, {
        id: '196254672418373632',
        name: 'Will F.',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: [],
    }, {
        id: '199641055837159425',
        name: 'Anthony',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: [],
    }, {
        id: '159170842528448512',
        name: 'Ross',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: [],
    },
].map(super_person => [super_person.id, super_person]));

/**
 * The Default Guild Config is the config which is applied to all new guilds be default
 */
const DEFAULT_GUILD_CONFIG = {
    command_prefix: '%',
    command_message_removal: 'enabled',
    unknown_command_warnings: 'enabled',
    clear_message: 'enabled',
    player_description: 'disabled',
    url_blocking: 'disabled',
    invite_blocking: 'disabled',
    disconnect_tts_voice: 'enabled',
    queue_tts_voice: 'disabled',
    beta_programs: [],
    user_warnings: [],
    admin_roles: [],
    moderator_roles: [],
    allowed_channels: [],
    new_member_roles: [],
    volume_multiplier: 1,
    volume_maximum: 200,
    tts_provider: 'ibm',
    tts_voice_ibm: 'en-GB_KateV3Voice',
    tts_voice_google: 'en-us',
};

/**
 * The ids of guilds known to be a bot listing service
 */
const BOT_LIST_GUILDS = [
    '264445053596991498', // Discord Bot List (https://top.gg/)
    '446425626988249089', // Bots On Discord (https://bots.ondiscord.xyz/)
    '439866052684283905', // Discord Boats (https://discord.boats/)
    '110373943822540800', // Discord Bots (https://discord.bots.gg/)
    '561851349831122954', // Arcane Center (https://arcane-center.xyz/)
    '568567800910839811', // Discord Extreme List (https://discordextremelist.xyz/)
];

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    PUBLIC_VERSION: PUBLIC_VERSION,
    SHORT_NAME: SHORT_NAME,
    COMMON_NAME: COMMON_NAME,
    LONG_NAME: LONG_NAME,
    OWNER_ID: OWNER_ID,
    WEBSITE: WEBSITE,
    GITHUB: GITHUB,
    DONATION_SOURCES: DONATION_SOURCES,
    SPECIAL_CHANNELS: SPECIAL_CHANNELS,
    WHITELISTED_CONTROL_BOTS: WHITELISTED_CONTROL_BOTS,
    SUPER_PERMS: SUPER_PERMS,
    SUPER_PEOPLE: SUPER_PEOPLE,
    DEFAULT_GUILD_CONFIG: DEFAULT_GUILD_CONFIG,
    BOT_LIST_GUILDS: BOT_LIST_GUILDS,
};
