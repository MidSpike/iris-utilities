'use strict';

//#region dependencies
const Sugar = require('sugar');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
const { Reminder, ReminderManager } = require('../../libs/ReminderManager.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name:'REMINDME',
    category:`${DisBotCommander.categories.UTILITIES}`,
    weight:5,
    description:'Creates a reminder',
    aliases:['remindme'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args.length > 0 && command_args.includes('in') && command_args.includes('to')) {
            const user_time = command_args.join(' ').match(/(in\s(.*?)\sto)/g)?.[0]?.replace(/(\sto)/g, '')?.trim() ?? 'in 5 minutes';
            const reminder_time = Sugar.Date.create(user_time);
            if (isNaN(reminder_time)) {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:'Whoops!',
                    description:`\`${user_time}\` is not a valid unit of time that I can understand!`
                }, message));
                return;
            }
            const user_remind_message = command_args.join(' ').replace(`${user_time} to`, '').trim() || 'default reminder';
            const reminder = new Reminder(message.author.id, reminder_time, user_remind_message);
            ReminderManager.add(reminder);
            message.channel.send(new CustomRichEmbed({
                title:`I've set your reminder for ${reminder_time}`,
                description:`**Reminder Text:**${'```'}\n${user_remind_message}\n${'```'}`
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Command Usage',
                description:`${'```'}\n${discord_command} in 10 minutes to do stuff!\n${'```'}Remember to include the \`in\` and \`to\`!`
            }, message));
        }
    },
});
