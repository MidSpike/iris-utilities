'use strict';

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'warn',
    async callback(warning) {
        console.warn(`----------------------------------------------------------------------------------------------------------------`);
        console.warn(`client#warn:`, warning);
        console.warn(`----------------------------------------------------------------------------------------------------------------`);
    },
};