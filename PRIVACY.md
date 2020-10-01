## Last Updated: 2020-10-01

#### The following definitions will be used in this document:
- id = a 'snowflake' used by Discord for identifying users, guilds, emojis, messages, attachments, etc
- name = the (user/nick)name of an individual (in/out of) a guild
- tag = the username of an individual (in/out of) a guild appended by a discriminator
- discriminator = the 4-digit sequence of numbers after a Discord username prepended by a '#'
- guild(s) = Discord guild(s) that this bot resides in
- user(s) = you, a guild owner, users (in/out of) said guild
- Bot = the Discord Bot that showed you this file
- command_prefix = (by default: %) the method of accessing this Bot in a guild containing this Bot
- command = anything sent by a guild user that starts with the command_prefix

#### The Bot collects, processes, and stores the following information known as 'command_message_history':
- messages (starting with the command_prefix) sent in guild text-based channels
- messages including `@mentions` of this Bot
- message reactions on Bot messages
- message reactions on any non-bot message when a guild has reaction-logging enabled
- direct messages to this Bot
- command_message_history includes the following information:
    - the entire message involved (message text, embeds, attachments, etc)
    - user information attached to that message: id, name, tag
    - guild information attached to that message: id, name

#### If you wish to have your command_message_history removed then you can do any of the following:
- use command `request_history_deletion`
- join the Bot's support guild and contact staff (use command `support_discord` to receive an invite)

#### The Bot collects, processes, and stores the following information known as 'guild_config_information':
- guild: id, name, region, member count, bot count
- guild owner: id, name, tag
- permissions granted to Bot in guild
- the last known connection of Bot to guild
- other various information related to the functionality of Bot commands

#### A Guild Owner may request their guild_config_information by doing the following:
- join the Bot's support guild and contact staff (use command `support_discord` to receive an invite)

#### This document will be updated in the future to better inform users of how data is managed and stored in the Bot.
