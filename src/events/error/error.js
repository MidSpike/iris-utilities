'use strict';

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'error',
    async callback(error) {
        console.error(`----------------------------------------------------------------------------------------------------------------`);
        console.trace(`client#error:`, error);
        console.error(`----------------------------------------------------------------------------------------------------------------`);
    }
};
