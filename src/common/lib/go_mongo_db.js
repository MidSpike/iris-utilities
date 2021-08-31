'use strict';

//------------------------------------------------------------//

const { GoMongoDB } = require('go-mongo-db');

//------------------------------------------------------------//

const go_mongo_db = new GoMongoDB(process.env.MONGO_CONNECTION_URL);

//------------------------------------------------------------//

module.exports = {
    go_mongo_db,
};
