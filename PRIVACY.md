# Hello world, this is iris-utilities!

## Privacy

---

### Definitions:

#### The following definitions will be used in this document:

- [snowflake](https://discord.com/developers/docs/reference#snowflakes) = a unique identifier used by Discord (and others)
- id = a snowflake used for identification and classification.
- name = the (user/nick)name of an individual (in/out of) a guild.
- tag = the username of an individual (in/out of) a guild appended by a discriminator.
- discriminator = the sequence of numbers after a Discord username prepended by a '#'.
- guild(s) = Discord guild(s) (also known as "Server(s)") that this bot resides in.
- user(s) = you, a guild owner, users (in/out of) guilds.
- bot = the Discord bot that showed you this document.
- command = anything sent by a user that triggers this bot to complete an action.

---

### User data:

#### This bot collects, processes, and stores the following information known as command_message_history:

- messages including an `@mention` of this bot.
- direct messages to this bot.
- command_message_history includes the following information:
    - application command context (command, content, embeds, attachments, etc).
    - user information attached: id, name, tag.
    - guild information attached: id, name.

#### If you wish to have your command_message_history removed then you can do any of the following:

- Contact this bot's support staff in the support server and request for your command_message_history be removed.

---

### Guild data:

#### This bot collects, processes, and stores the following information known as guild_config_information:

- the last known connection timestamp of this bot to a guild.
- the last known modification timestamp of guild_config_information.
- other various information related to the functionality of this bot in the guild.

#### A guild owner may request their guild_config_information by doing the following:

- Contact this bot's support staff in the support server and request for your guild_config_information.

#### A guild owner may request for their guild_config_information to be removed by doing the following:

- Remove this bot from your guild (an automatic removal will occur after a period of time).
- Contact this bot's support staff in the support server and request for guild_config_information to be removed.

---

### Usage of Guild and/or User data:

The usage of collected data is **only** for the purpose of this bot's functionality.

The usage of collected data is **not** for consumption by any third-party.

---

### Frequently asked questions:

#### How can I contact the support staff for this bot?

- Use the `info` command to receive an invite to this bot's support guild.

#### Who has access to non-anonymous stored data?

- Only the owner of this bot shall have read/write/delete access to stored (non-)anonymous data.

#### Who has access to anonymous stored data?

- Only the admins of this bot (also known as "super people") shall have read access to stored anonymous data.

#### How do I delete my data?

- Please refer to [User data](#user-data)

#### How do I delete my guild's data?

- Please refer to [Guild data](#guild-data)

---

#### This document will be updated in the future to better inform users of how data is managed and stored.
