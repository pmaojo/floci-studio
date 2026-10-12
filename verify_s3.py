import asyncio
import os
import time
from playwright.async_api import async_playwright
import boto3

async def run():
    # Setup the mock bucket and object in Localstack
    s3 = boto3.client('s3', endpoint_url='http://localhost:4566', aws_access_key_id='test', aws_secret_access_key='test', region_name='us-east-1')
    try:
        s3.create_bucket(Bucket='test-presigned-bucket')
    except Exception:
        pass
    s3.put_object(Bucket='test-presigned-bucket', Key='test-file.txt', Body=b'Hello, world!')

    # Run Playwright to verify the UI
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(record_video_dir='/home/jules/verification/')
        page = await context.new_page()

        # Start frontend dev server if it isn't running
        # Assuming frontend is already running, or we just navigate
        await page.goto("http://localhost:3000")

        # Wait for page to load
        await page.wait_for_timeout(2000)

        # Click on S3 in the sidebar or navigate to it directly
        await page.goto("http://localhost:3000/s3")
        await page.wait_for_timeout(2000)

        # Click on the test bucket
        # Find the button representing the bucket and click it.
        # The S3 View renders buckets in cards, we can look for the title text or use a generic selector.
        bucket_element = page.locator("button[aria-label='Open bucket test-presigned-bucket']").first
        await bucket_element.click(force=True)

        await page.wait_for_timeout(2000)

        # The object should be visible, take a screenshot
        os.makedirs('/home/jules/verification/', exist_ok=True)
        await page.screenshot(path="/home/jules/verification/s3_objects_view.png")

        # Optionally click the presigned url button to ensure it works
        # The button has title="Generate Presigned URL (1 Hour)"
        presigned_btn = page.locator("button[title='Generate Presigned URL (1 Hour)']").first
        await presigned_btn.click()

        # Let the clipboard alert show up, wait a bit
        await page.wait_for_timeout(1000)
        await page.screenshot(path="/home/jules/verification/s3_presigned_url_alert.png")

        await context.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
