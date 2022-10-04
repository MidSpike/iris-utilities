# Hello world, this is iris-utilities!

## Privacy

---

### Definitions:

#### The following definitions will be used in this document:

- [snowflake](https://discord.com/developers/docs/reference#snowflakes) = a unique identifier.
- id = a snowflake (or other unique identifier) used for identification and classification.
- name = the (global/guild)(user/nick)name of an individual.
- tag = the global username of an individual appended by a discriminator.
- discriminator = the sequence of numbers after a Discord username joined by a '#'.
- guild(s) = Discord guild(s) (also known as "Server(s)") that this bot has access to.
- user(s) = users residing in a guild that use this bot and/or other users that use this bot.
- bot(s) = an [application](https://discord.com/developers/docs/intro) on the Discord platform.
- command(s) = a trigger for this bot to complete a user-requested action.

---

### User data:

<details>

<summary>Interaction History</summary>

#### Quick Disclaimer:

Many features of this bot have changed over time to adapt to how Discord has changed over time.

Some of these changes, wether intentional or not, have resulted in a reduction of data collection.

Certain aspects of this document are broadened to address potential privacy concerns.

#### This bot collects, processes, and stores the following information known as interaction_history:

- messages including an `@mention` of this bot.
- direct messages sent to this bot.
- interaction_history includes the following information:
    - application command context (command, content, embeds, attachments, etc).
    - user information attached: id, name, tag.
    - guild information attached: id, name.

#### If you wish to have your interaction_history removed then you can do any of the following:

1. Contact this bot's support staff (using appropriate channels).
2. Request for your interaction_history be removed.

</details>

<details>

<summary>User Configuration</summary>

#### This bot collects, processes, and stores the following information known as user_configuration:

- user_configuration includes the following information:
    - user information attached: id.
    - various settings used to customize the bot's behavior for the user.

#### If you wish to have your user_configuration removed then you can do any of the following:

1. Contact this bot's support staff (using appropriate channels).
2. Request for your user_configuration be removed.

</details>

---

### Guild data:

<details>

<summary>Guild Configuration</summary>

#### This bot collects, processes, and stores the following information known as a guild_config:

- the last known connection timestamp of this bot to a guild.
- the last known modification timestamp of guild_config.
- other various information related to the functionality of this bot in the guild.

#### A guild owner may request their guild_config by:

1. Contact this bot's support staff (using appropriate channels).
2. Request for their guild_config to be sent to them.

#### A guild owner may request for their guild_config to be removed by:

1. Contact this bot's support staff (using appropriate channels).
2. Request for their guild_config to be removed.

</details>

---

### Usage of data:

Usage of collected data is **not** intended for any of the following:

- selling to third parties
- sharing with third parties
- any other purpose not related to this bot's functionality

---

Certain data submitted to this bot may be sent to external services for processing.

For example, the `weather_info` command sends anonymized data to [https://open-meteo.com/](https://open-meteo.com/) for processing.

In return for this data, Open Meteo provides user-requested weather information to this bot.

---

### Frequently asked questions:

#### How can I contact the support staff for this bot?

- Use the `info` command to receive an invite to this bot's support guild.

#### Who has access to non-anonymous stored data?

- Only the owner of this bot shall have full access to stored (non-)anonymous data.

#### Who has access to anonymous stored data?

- Only the admins of this bot (also known as "super people") shall have read access to stored anonymous data.

#### How do I request for my non-anonymized data to be deleted?

- Please refer to [User data](#user-data).

#### How do I request for my guild's non-anonymized data to be deleted?

- Please refer to [Guild data](#guild-data).

#### I have more questions, who can I contact?

1. Join this bot's support guild.
2. Contact the support staff (using appropriate channels).

---

#### This document will be updated in the future to better inform users of how data is managed and stored.
