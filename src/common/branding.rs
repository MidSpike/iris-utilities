//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

pub mod color {
    use poise::serenity_prelude::model::Color as SerenityColor;

    pub struct BrandColor(u32);

    impl Into<SerenityColor> for BrandColor {
        fn into(
            self
        ) -> SerenityColor {
            SerenityColor::new(self.0)
        }
    }

    pub const PRIMARY: BrandColor = BrandColor(0xFF5500);
}

//------------------------------------------------------------//

pub mod emojis {
    use poise::serenity_prelude::EmojiId as SerenityEmojiId;
    use poise::serenity_prelude::ReactionType as SerenityReaction;
    use poise::serenity_prelude::CacheHttp as SerenityCacheHttp;

    pub struct BrandEmoji {
        id: u64,
        name: String,
        animated: bool,
    }

    impl Into<SerenityReaction> for BrandEmoji {
        fn into(
            self
        ) -> SerenityReaction {
            SerenityReaction::Custom {
                id: SerenityEmojiId::new(self.id),
                name: Some(self.name),
                animated: self.animated,
            }
        }
    }

    pub async fn get_application_emojis(
        http: impl SerenityCacheHttp,
    ) -> Vec<BrandEmoji> {
        let app_emojis = http.http().get_application_emojis().await.expect("Failed to get application emojis");

        app_emojis.into_iter().map(|emoji| {
            BrandEmoji {
                id: emoji.id.get(),
                name: emoji.name,
                animated: emoji.animated,
            }
        }).collect()
    }

    pub enum BrandEmojis {
        NumberZero,
        NumberOne,
        NumberTwo,
        NumberThree,
        NumberFour,
        NumberFive,
        NumberSix,
        NumberSeven,
        NumberEight,
        NumberNine,
    }

    impl BrandEmojis {
        pub async fn fetch(
            &self,
            http: impl SerenityCacheHttp,
        ) -> BrandEmoji {
            let emoji_name = match self {
                BrandEmojis::NumberZero => "bot_emoji_zero",
                BrandEmojis::NumberOne => "bot_emoji_one",
                BrandEmojis::NumberTwo => "bot_emoji_two",
                BrandEmojis::NumberThree => "bot_emoji_three",
                BrandEmojis::NumberFour => "bot_emoji_four",
                BrandEmojis::NumberFive => "bot_emoji_five",
                BrandEmojis::NumberSix => "bot_emoji_six",
                BrandEmojis::NumberSeven => "bot_emoji_seven",
                BrandEmojis::NumberEight => "bot_emoji_eight",
                BrandEmojis::NumberNine => "bot_emoji_nine",
            };

            let app_emojis = get_application_emojis(http).await;

            app_emojis.into_iter()
            .find(|emoji| emoji.name == emoji_name)
            .expect("Failed to find brand emoji")
        }
    }
}
