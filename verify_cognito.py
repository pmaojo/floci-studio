from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(record_video_dir="/home/jules/verification/")
    page = context.new_page()

    page.goto("http://localhost:3000/cognito")

    # Wait for the page to load, e.g. looking for the header
    page.wait_for_selector("text=Cognito User Pools", timeout=10000)

    # Take a screenshot
    page.screenshot(path="/home/jules/verification/cognito.png")

    # Close context first to save video
    context.close()
    browser.close()
