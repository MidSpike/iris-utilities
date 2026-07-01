//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

pub mod ai {
    pub mod gpt;

    pub mod user_ai_usage;
}

pub mod branding;

pub mod entitlements;

pub mod helpers {
    pub mod bot;

    pub mod html_rendering;

    pub mod libre_translate;

    pub mod time;
}

pub mod moderation;

pub mod music;

pub mod database {
    pub mod adapter;

    pub mod interfaces {
        pub mod guild_config;

        pub mod user_config;
    }
}

pub mod telemetry {
    pub mod anonymous_command_log;

    pub mod guild_retention;

    pub mod user_feedback;
}
