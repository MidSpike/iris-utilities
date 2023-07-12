//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GoMongoDb } from 'go-mongo-db';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const mongo_connection_url = parseEnvironmentVariable(EnvironmentVariableName.MongoConnectionUrl, 'string');

//------------------------------------------------------------//

export const go_mongo_db = new GoMongoDb(mongo_connection_url);
