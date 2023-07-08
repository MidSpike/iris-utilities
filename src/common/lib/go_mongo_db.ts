//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import { GoMongoDb } from 'go-mongo-db';

//------------------------------------------------------------//

const mongo_connection_url = process.env.MONGO_CONNECTION_URL as string;
if (!mongo_connection_url?.length) throw new Error('\'process.env.MONGO_CONNECTION_URL\' is not defined or is empty');

//------------------------------------------------------------//

export const go_mongo_db = new GoMongoDb(mongo_connection_url);
