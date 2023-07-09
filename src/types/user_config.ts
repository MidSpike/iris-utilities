//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

export type UserId = string;

//------------------------------------------------------------//

export interface UserConfig {
    [key: string]: unknown;
    user_id: UserId;
    voice_recognition_enabled?: boolean;
    gpt_access_enabled?: boolean;
    donator?: boolean;
}
