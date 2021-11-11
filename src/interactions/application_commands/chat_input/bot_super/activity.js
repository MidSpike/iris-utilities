'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'activity',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                name: 'type',
                description: 'n/a',
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                required: true,
                choices: [
                    { name: 'Watch Together', value: '880218394199220334' },
                    { name: 'Watch Together (dev)', value: '880218832743055411' },
                    { name: 'Chess', value: '832012774040141894' },
                    { name: 'Chess (dev)', value: '832012586023256104' },
                    { name: 'Checkers', value: '832013003968348200' },
                    { name: 'Poker', value: '755827207812677713' },
                    { name: 'Cards Against Humanity', value: '879863881349087252' },
                    { name: 'Betrayal', value: '773336526917861400' },
                    { name: 'Fishing', value: '814288819477020702' },
                    { name: 'Letter Tile', value: '879863686565621790' },
                    { name: 'Word Snacks', value: '879863976006127627' },
                    { name: 'Doodle Crew', value: '878067389634314250' },
                    { name: 'Spell Cast', value: '852509694341283871' },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.BOT_SUPER,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('BOT_SUPER'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply();

        const voice_channel = interaction.member?.voice.channel;
        if (!voice_channel) return;

        const game_invite = await voice_channel.createInvite({
            temporary: false,
            maxAge: 0,
            maxUses: 0,
            targetType: 2,
            targetApplication: interaction.options.getString('type'),
        });

        await interaction.followUp({
            content: `${interaction.member}, [click me](${game_invite.url})!`,
        }).catch(console.warn);
    },
});
