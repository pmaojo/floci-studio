from playwright.sync_api import sync_playwright
import os
import subprocess
import time

def run():
    print("Starting sidecar and frontend...")
    # Start both services
    sidecar_proc = subprocess.Popen(["pnpm", "run", "sidecar:dev"])
    front_proc = subprocess.Popen(["pnpm", "run", "dev"])

    print("Waiting for services to start...")
    time.sleep(15)

    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/")
        page = context.new_page()

        print("Navigating to frontend...")
        page.goto("http://localhost:3000/apigateway")

        page.wait_for_selector("text=API Gateway")
        page.wait_for_timeout(3000) # give time to fetch data

        # Test creating an API
        page.click("button:has-text('Create API')")
        page.wait_for_selector("text=API Name")
        page.fill("input[placeholder='my-serverless-api']", "test-api")
        # Ensure we click the specific Create API button inside the modal dialog
        # The modal has class fixed inset-0, so we target buttons inside it
        page.click("div.fixed.inset-0 button:has-text('Create API')")

        page.wait_for_timeout(3000)

        print("Capturing screenshot...")
        page.screenshot(path="/home/jules/verification/apigateway_view.png")

        context.close()
        browser.close()

    print("Killing processes...")
    sidecar_proc.terminate()
    front_proc.terminate()
    print("Done")

if __name__ == "__main__":
    run()
