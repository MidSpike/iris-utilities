//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use tokio_stream::StreamExt;

use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::page::ScreenshotParams;
use chromiumoxide::cdp::browser_protocol::page::CaptureScreenshotFormat;

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

/// Great care should be taken when passing in `untrusted_html`.
/// Use the `escape_html` function to sanitize it first.
pub async fn html_to_png(
    untrusted_html: String,
) -> Result<Vec<u8>, Error> {
    let browser_config = BrowserConfig::builder().build()?;

    // Yes, I know that this spawns a new browser instance every call.
    // It's not ideal, but rate-limits should prevent this from being abused.
    let (mut browser, mut handler) = Browser::launch(browser_config).await?;

    // Spawn a new task that continuously polls the handler.
    let handle = tokio::task::spawn(async move {
        while let Some(h) = handler.next().await {
            if h.is_err() {
                break;
            }
        }
    });

    // Although I'm not happy with how this is implemented,
    // it's the simplest way to render without loading a file.
    let page = browser.new_page("about:blank").await?;
    page.set_content(untrusted_html).await?;

    // Force the page to wait before taking a screenshot.
    // This is to ensure that the page has finished rendering.
    // Fonts, images, etc. may not be loaded if we don't wait.
    //
    // Amazingly, JavaScript still manged to sneak itself
    // into this rust rewrite of the TypeScript codebase.
    page.evaluate("() => new Promise((resolve) => setTimeout(resolve, 1_000))").await?;

    // I was unable to replicate the dynamic screenshot dimensions
    // that the previous TypeScript codebase could using Puppeteer.
    // In the future I'd like to bring back that dynamic aspect.
    let screenshot_params =
        ScreenshotParams::builder()
        .format(CaptureScreenshotFormat::Png)
        .omit_background(true)
        .full_page(true)
        .build();

    let png = page.screenshot(screenshot_params).await?;

    // Cleanup the browser and handle tasks.
    browser.close().await?;
    handle.await?;

    Ok(png)
}
