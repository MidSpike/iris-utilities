## Last updated: 2020-11-28 1:10 PM EST

---

### Definitions:

#### The following definitions will be used in this document:
- id = a 'snowflake' used by Discord for identifying users, guilds, emojis, messages, attachments, etc.
- name = the (user/nick)name of an individual (in/out of) a guild.
- tag = the username of an individual (in/out of) a guild appended by a discriminator.
- discriminator = the 4-digit sequence of numbers after a Discord username prepended by a '#'.
- guild(s) = Discord guild(s) that this bot resides in.
- user(s) = you, a guild owner, users (in/out of) said guild.
- bot = the Discord bot that showed you this file.
- command_prefix = (by default: %) the method of accessing this bot in a guild containing this bot.
- command = anything sent by a guild user that starts with the command_prefix.

---

### User data:

#### The bot collects, processes, and stores the following information known as command_message_history:
- messages (starting with the command_prefix) sent in guild text-based channels.
- messages including `@mentions` of this bot.
- message reactions on bot messages.
- message reactions on any non-bot message when a guild has reaction-logging enabled.
- direct messages to this bot.
- command_message_history includes the following information:
    - the entire message involved (message text, embeds, attachments, etc).
    - user information attached to that message: id, name, tag.
    - guild information attached to that message: id, name.

#### If you wish to have your command_message_history removed then you can do any of the following:
- Use the command `request_history_deletion`.
- Contact this bot's support staff.

---

### Guild data:

#### This bot collects, processes, and stores the following information known as guild_config_information:
- guild: id, name, region, member count, bot count.
- guild owner: id, name, tag.
- permissions granted to bot in guild.
- the last known connection of bot to guild.
- other various information related to the functionality of bot commands.

#### A guild owner may request their guild_config_information by doing the following:
- Contact this bot's support staff.

#### A guild owner may request for their guild_config_information to be removed by doing the following:
1. Remove this bot from your guild.
2. Do one of the following:
    - Contact this bot's support staff.
    - Wait up to 30 days for it to be automatically deleted.

---

### Frequently asked questions

#### How can I contact the support staff for this bot?
- Direct message this bot.
- Use the command `support_discord` to receive an invite to this bot's support guild.

#### Who has access to non-anonymous stored data?
- Only the owner of this bot shall have read/write/delete access to stored (non-)anonymous data.

#### Who has access to anonymous stored data?
- Only the admins (also known as "Super People") of this bot shall have read access to stored anonymous data.

#### How do I delete my data?
- Please refer to [User Data](#user-data)

#### How do I delete my guild's data?
- Please refer to [Guild Data](#guild-data)

---

#### This document will be updated in the future to better inform users of how data is managed and stored in the Bot.
