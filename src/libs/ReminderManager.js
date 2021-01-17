'use strict';

const Scheduler = require('node-schedule');

const { pseudoUniqueId } = require('../utilities.js');

const { client } = require('./discord_client.js');
const { CustomRichEmbed } = require('./CustomRichEmbed.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Constructs a new reminder to use with the ReminderManager
 * @param {String} user_id 
 * @param {Date} date_time 
 * @param {String} message the contents of the reminder
 * @returns {Reminder} a new Reminder
 */
class Reminder {
    constructor(user_id, date_time, message) {
        this.id = pseudoUniqueId();
        this.user_id = user_id;
        this.date_time = date_time;
        this.message = message;
    }
}

class ReminderManager {
    static #reminders = {};

    static get reminders() {
        return this.#reminders;
    }

    static add(reminder) {
        this.#reminders = {
            ...this.reminders,
            [reminder.id]: reminder
        };

        Scheduler.scheduleJob(reminder.date_time, async () => {
            const user_to_dm = client.users.cache.get(reminder.user_id);
            if (!user_to_dm) return;
            const dmChannel = await user_to_dm.createDM();
            dmChannel.send(new CustomRichEmbed({
                title: 'Here is your reminder!',
                description: `${reminder.message}`
            }));
            this.remove(reminder);
        });

        return this;
    }

    static remove(reminder) {
        delete this.#reminders[reminder.id];
        return this;
    }
}

module.exports = {
    Reminder,
    ReminderManager,
};
