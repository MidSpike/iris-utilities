'use strict';

//---------------------------------------------------------------------------------------------------------------//

const { Collection } = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * v[status][year]-[month]-[day]_[semi-version]
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
const PUBLIC_VERSION = 'vS_2020-10-22_1';

const SHORT_NAME = 'IRIS'; // [ a-z | A-Z | 0-9 | - | _ ]
const COMMON_NAME = 'I.R.I.S. Utilities';
const LONG_NAME = 'Interactive Reconnaissance Information Service Utilities';

const OWNER_ID = '163646957783482370';

const WEBSITE = 'https://iris-utilities.com/';
const PATREON = 'https://patreon.com/midspike';
const GITHUB = 'https://github.com/MidSpike/iris-utilities';

const SPECIAL_CHANNELS = [
    {
        id: 'ARCHIVED_CHANNELS_CATEGORY',
        type: 'category',
        name: 'iris-archived-channels',
        description: 'Used for organizing archived channels.',
    }, {
        id: 'SPECIAL_CHANNELS_CATEGORY',
        type: 'category',
        name: 'I.R.I.S. Utilities',
        description: 'Used for organizing the special channels.',
    }, {
        id: 'BOT_COMMANDS',
        type: 'text',
        name: 'iris-bot-commands',
        description: 'Used as a backup-method for using the bot if you incorrectly use the \'set_allowed_channels\' command and accidentally lock yourself out.',
    }, {
        id: 'BOT_RESTARTS',
        type: 'text',
        name: 'iris-restart-log',
        description: 'Useful for keeping track of bot restarts.',
    }, {
        id: 'BOT_UPDATES',
        type: 'text',
        name: 'iris-update-log',
        description: 'Sends out update messages and announcements of new features for the bot to your server!',
    }, {
        id: 'GUILD_COMMANDS',
        type: 'text',
        name: 'iris-command-log',
        description: 'Logs all of the bot\'s commands entered by members in this server.',
    }, {
        id: 'GUILD_MEMBERS',
        type: 'text',
        name: 'iris-member-log',
        description: 'Sends join/leave messages like the default \'System Channel\' for servers.',
    }, {
        id: 'GUILD_INVITES',
        type: 'text',
        name: 'iris-invite-log',
        description: 'Used for logging invites created/destroyed by members in the server.',
    }, {
        id: 'GUILD_MODERATION',
        type: 'text',
        name: 'iris-moderation-log',
        description: 'Used to log when the bot\'s moderation features have been used.',
    }, {
        id: 'GUILD_REACTIONS',
        type: 'text',
        name: 'iris-reaction-log',
        description: 'Shows when reactions are added to a message by users.',
    }, {
        id: 'GUILD_APPEALS',
        type: 'text',
        name: 'iris-appeals-log',
        description: 'This channel will allow your server to receive a single \'apology\' message from a user that has been banned via the bot.',
    },
];

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

const SUPER_PEOPLE = new Collection([
    {
        id: '163646957783482370',
        name: 'MidSpike',
        public: false,
        allowed_permissions: ['*'],
        denied_permissions: []
    }, {
        id: '196254672418373632',
        name: 'Will F.',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: []
    }, {
        id: '255071492801429504',
        name: 'QuackAttack',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: []
    }, {
        id: '557744032621658123',
        name: 'ThreeShot',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: []
    }, {
        id: '686385736269824062',
        name: 'A.Baker',
        public: true,
        allowed_permissions: ['*'],
        denied_permissions: []
    },
].map(super_person => [super_person.id, super_person]));

const DEFAULT_GUILD_CONFIG = {
    command_prefix: '%',
    command_message_removal: 'enabled',
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
    users_in_timeout: [],
    volume_multiplier: 1,
    volume_maximum: 200,
    tts_provider: 'ibm',
    tts_voice_ibm: 'en-GB_KateV3Voice',
    tts_voice_google: 'en-us',
};

const BOT_LIST_GUILDS = [
    '264445053596991498', // Discord Bot List (https://top.gg/)
    '446425626988249089', // Bots On Discord (https://bots.ondiscord.xyz/)
    '439866052684283905', // Discord Boats (https://discord.boats/)
    '110373943822540800', // Discord Bots (https://discord.bots.gg/)
    '561851349831122954', // Arcane Center (https://arcane-center.xyz/)
];

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    PUBLIC_VERSION: PUBLIC_VERSION,
    SHORT_NAME: SHORT_NAME,
    COMMON_NAME: COMMON_NAME,
    LONG_NAME: LONG_NAME,
    OWNER_ID: OWNER_ID,
    WEBSITE: WEBSITE,
    PATREON: PATREON,
    GITHUB: GITHUB,
    SPECIAL_CHANNELS: SPECIAL_CHANNELS,
    SUPER_PERMS: SUPER_PERMS,
    SUPER_PEOPLE: SUPER_PEOPLE,
    DEFAULT_GUILD_CONFIG: DEFAULT_GUILD_CONFIG,
    BOT_LIST_GUILDS: BOT_LIST_GUILDS,
};
