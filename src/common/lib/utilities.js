'use strict';

//------------------------------------------------------------//

/**
 * Asynchronous setTimeout
 * @param {Number} time_in_milliseconds
 * @returns {Promise<void>}
 */
function delay(time_in_milliseconds) {
    if (typeof time_in_milliseconds !== 'number') throw new TypeError('\`time_in_milliseconds\` must be a number');

    return new Promise((resolve, reject) => setTimeout(() => resolve(), time_in_milliseconds));
}

//------------------------------------------------------------//

module.exports = {
    delay,
};
