'use strict';

//------------------------------------------------------------//

import { GoMongoDB } from 'go-mongo-db';

//------------------------------------------------------------//

const mongo_connection_url = process.env.MONGO_CONNECTION_URL;
if (!mongo_connection_url?.length) throw new Error('\'process.env.MONGO_CONNECTION_URL\' is not defined or is empty');

//------------------------------------------------------------//

export const go_mongo_db = new GoMongoDB(mongo_connection_url);
