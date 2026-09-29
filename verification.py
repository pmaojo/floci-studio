from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/")
        page = context.new_page()

        # Navigate to Cognito View
        page.goto("http://localhost:3000/cognito")
        page.wait_for_selector("text=Cognito User Pools", timeout=10000)

        # Take a screenshot
        page.screenshot(path="/home/jules/verification/cognito_view.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    verify()
