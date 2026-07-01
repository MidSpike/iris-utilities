//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::io::Write;

use reqwest::Url;

use headless_chrome::protocol::cdp::Page::CaptureScreenshotFormatOption;

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

/// Naive approach to sanitizing input for chromium-oxide.
/// The most important aspect is to prevent JavaScript injection.
/// In the future a more robust solution should be implemented.
pub fn escape_html(
    raw_html: String,
) -> String {
    raw_html
    .replace("<script>", "")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace("&", "&amp;")
    .replace("\"", "&quot;")
    .replace("'", "&apos;")
    .replace("`", "&grave;")
    .replace("/", "&#47;")
    .replace("\\", "&#92;")
}

/// Great care should be taken by the caller to sanitize user input.
/// Utilize `escape_html(raw_html: String)` to block unwanted inputs.
pub async fn html_to_png(
    untrusted_html: String,
) -> Result<Vec<u8>, Error> {
    let result = tokio::task::spawn_blocking(
        move || {
            html_to_png_sync(untrusted_html)
        }
    ).await?;

    match result {
        Ok(png_data) => Ok(png_data),
        Err(e) => {
            eprintln!("chromium_oxide::html_to_png(): Error occurred: {}", e);

            Err(e)
        },
    }
}

fn html_to_png_sync(
    untrusted_html: String,
) -> Result<Vec<u8>, Error> {
    // 1. Write HTML to temporary file.

    let mut temp_html_file = tempfile::NamedTempFile::with_suffix(".html")?;
    write!(temp_html_file, "{}", untrusted_html)?;

    let temp_html_file_url =
        Url::from_file_path(temp_html_file.path())
        .expect("Failed to convert file path to URL.");

    // 2. Take screenshot with the headless browser.

    let browser_options =
        headless_chrome::LaunchOptions::default_builder()
        .headless(true)
        .sandbox(false)
        .window_size(Some((1000, 1000)))
        .build()
        .expect("Couldn't find appropriate Chrome binary.");

    let browser = headless_chrome::Browser::new(browser_options)?;

    let browser_tab = browser.new_tab()?;

    let png_data =
        browser_tab
        .navigate_to(temp_html_file_url.as_str())?
        .wait_for_element("#screenshot")?
        .capture_screenshot(CaptureScreenshotFormatOption::Png)?;

    // 3. Cleanup

    temp_html_file.close()?;

    Ok(png_data)
}
