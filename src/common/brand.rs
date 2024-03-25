//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

pub struct BrandColor(u32);

impl BrandColor {
    pub fn new() -> Self {
        Self(0xFF5500)
    }

    pub fn get(&self) -> u32 {
        self.0
    }
}

//------------------------------------------------------------//

pub struct BrandEmoji(u64, String);

impl BrandEmoji {
    pub fn from(
        id: u64,
        name: impl Into<String>,
    ) -> Self {
        Self(id, name.into())
    }

    pub fn id(&self) -> u64 {
        self.0
    }

    pub fn name(&self) -> &String {
        &self.1
    }
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
    pub fn get(&self) -> BrandEmoji {
        match self {
            BrandEmojis::NumberZero => BrandEmoji::from(678691063178985480, "bot_emoji_zero"),
            BrandEmojis::NumberOne => BrandEmoji::from(678691126357655572, "bot_emoji_one"),
            BrandEmojis::NumberTwo => BrandEmoji::from(678691155738624011, "bot_emoji_two"),
            BrandEmojis::NumberThree => BrandEmoji::from(678691184603824128, "bot_emoji_three"),
            BrandEmojis::NumberFour => BrandEmoji::from(678691214102364181, "bot_emoji_four"),
            BrandEmojis::NumberFive => BrandEmoji::from(678691239348011018, "bot_emoji_five"),
            BrandEmojis::NumberSix => BrandEmoji::from(678691272986329102, "bot_emoji_six"),
            BrandEmojis::NumberSeven => BrandEmoji::from(678691301276778526, "bot_emoji_seven"),
            BrandEmojis::NumberEight => BrandEmoji::from(678691330783969290, "bot_emoji_eight"),
            BrandEmojis::NumberNine => BrandEmoji::from(678691358415781915, "bot_emoji_nine"),
        }
    }
}

