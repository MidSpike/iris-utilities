//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

pub fn format_duration(
    duration: std::time::Duration,
) -> String {
    if duration == std::time::Duration::ZERO {
        return String::from("0ms");
    }

    let milliseconds = duration.as_millis();
    let seconds = milliseconds / 1000;
    let minutes = seconds / 60;
    let hours = minutes / 60;
    let days = hours / 24;

    let milliseconds = milliseconds % 1000;
    let seconds = seconds % 60;
    let minutes = minutes % 60;
    let hours = hours % 24;

    let mut formatted_duration = String::new();

    if days > 0 {
        formatted_duration.push_str(&format!("{}d ", days));
    }

    if hours > 0 {
        formatted_duration.push_str(&format!("{}h ", hours));
    }

    if minutes > 0 {
        formatted_duration.push_str(&format!("{}m ", minutes));
    }

    if seconds > 0 {
        formatted_duration.push_str(&format!("{}s ", seconds));
    }

    if milliseconds > 0 {
        formatted_duration.push_str(&format!("{}ms ", milliseconds));
    }

    return formatted_duration.trim().to_owned();
}
