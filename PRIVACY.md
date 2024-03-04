# Hello world, this is iris-utilities!

## Privacy

---

### Definitions:

#### The following definitions will be used in this document:

- [snowflake](https://discord.com/developers/docs/reference#snowflakes) = a unique identifier.
- id = a snowflake (or other unique identifier) used for identification and classification.
- name = the (global/guild)(user/nick/display)name of an individual.
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

Some of these changes, whether intentional or not, have resulted in a reduction of data collection.

Certain aspects of this document are broadened to address potential privacy concerns.

#### This bot collects, processes, and stores the following information known as `interaction_history`:

- messages including an `@mention` of this bot.
- direct messages sent to this bot.
- `interaction_history` includes the following information:
    - application command context (command, content, embeds, attachments, etc).
    - user information attached: id, name.
    - guild information attached: id, name.

#### If you wish to have your `interaction_history` removed then you can do the following:

1. Contact this bot's support staff (using appropriate channels).
2. Request for your `interaction_history` be removed.

</details>

<details>

<summary>User Configuration</summary>

#### This bot collects, processes, and stores the following information known as user_config:

- user_config includes the following information:
    - user information attached: id.
    - various settings used to customize the bot's behavior for the user.

#### If you wish to have your user_config removed then you can do the following:

1. Contact this bot's support staff (using appropriate channels).
2. Request for your user_config be removed.

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

For example, the `weather_info` command sends anonymized data to third parties for processing.

This anonymized data includes (but is not limited to):
- The location entered by the user (example: "New York").

In return for this data, user-requested weather information is returned to this bot to be displayed to the user.

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
2. Contact the support staff (using appropriate methods).

---

#### This document will be updated in the future to better inform users of how data is managed and stored.
