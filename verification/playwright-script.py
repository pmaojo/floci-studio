from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/apigateway")
    page.wait_for_timeout(2000)

    # screenshot of the API Gateway empty view
    page.screenshot(path="verification/screenshots/verification-apigateway-empty.png")
    page.wait_for_timeout(1000)

    # Handle prompt dialog for API creation
    page.once("dialog", lambda dialog: dialog.accept("My Test API"))
    page.get_by_text("Create API").click()
    page.wait_for_timeout(2000)

    # screenshot of the created API
    page.screenshot(path="verification/screenshots/verification-apigateway-created.png")
    page.wait_for_timeout(1000)

    # Handle confirm dialog for API deletion
    page.once("dialog", lambda dialog: dialog.accept())
    # Instead of full drop, let's just ignore the deletion or use first matching

    if page.get_by_role("button", name="DROP").count() > 0:
        page.get_by_role("button", name="DROP").first.click()
        page.wait_for_timeout(2000)

    # final screenshot
    page.screenshot(path="verification/screenshots/verification.png")
    page.wait_for_timeout(1000)


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
