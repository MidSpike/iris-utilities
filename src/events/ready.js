'use strict';

//------------------------------------------------------------//

module.exports = {
    name: 'ready',
    async handler() {
        console.success(`<DC S#(${shard.id})> client is ready.`);
    },
};
