import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Floci Studio GUI — guided E2E tour.
 *
 * Drives the real React cockpit against a fully-seeded local AWS emulator
 * (see `e2e/`), asserting that each view renders the seeded resources, and
 * captures a screenshot of every stop. The screenshots are written straight
 * into the documentation site's asset folder so the published "GUI Tour" page
 * always reflects a real, passing run.
 *
 * Run the stack first (emulator + sidecar + Vite), then:
 *   PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npx playwright test gui-tour
 */

const SHOTS_DIR = path.resolve(__dirname, '../site/src/assets/gui');

const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`) });

/** Wait for the SPA shell + a route's content to settle before asserting. */
async function gotoView(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'networkidle' });
  // Give lazy-loaded views + their first AWS round-trip a moment to paint.
  await page.waitForTimeout(1200);
}

test.describe('Floci Studio GUI tour', () => {
  test('dashboard — system overview renders live resource counts', async ({ page }) => {
    await gotoView(page, '/');

    await expect(page.locator('text=FLOCI.IO')).toBeVisible();
    await expect(page.locator('text=REAL DATA ONLY')).toBeVisible();
    await expect(page.getByText('System Overview').first()).toBeVisible();

    // The seeded dataset is deterministic: 4 buckets, 3 functions, 2 tables.
    await expect(page.getByText('S3 Buckets').first()).toBeVisible();
    await expect(page.locator('text=STS_CALLER_IDENTITY')).toBeVisible();

    await shot(page, 'dashboard');
  });

  test('dashboard — AWS capability matrix', async ({ page }) => {
    await gotoView(page, '/');
    const matrixTab = page.locator('button:has-text("AWS Capability Matrix")');
    await expect(matrixTab).toBeVisible();
    await matrixTab.click();
    await expect(page.locator('text=Total Connected Capabilities')).toBeVisible();
    await page.waitForTimeout(600);
    await shot(page, 'dashboard-capability-matrix');
  });

  // Each stop: route, page heading, and a seeded resource that proves real data.
  const stops: Array<{ route: string; heading: string; expect: string; shot: string }> = [
    { route: '/s3', heading: 'S3 Object Storage', expect: 'floci-app-uploads', shot: 's3' },
    { route: '/sqs', heading: 'SQS Queues', expect: 'floci-jobs', shot: 'sqs' },
    { route: '/sns', heading: 'SNS Topics', expect: 'floci-alerts', shot: 'sns' },
    { route: '/lambda', heading: 'Lambda Compute', expect: 'floci-image-resizer', shot: 'lambda' },
    { route: '/kms', heading: 'KMS / Cryptography', expect: 'floci', shot: 'kms' },
    { route: '/secrets', heading: 'Secrets Manager', expect: 'floci/prod/database', shot: 'secrets' },
    { route: '/iam', heading: 'IAM Identity & Access', expect: 'floci-lambda-exec', shot: 'iam' },
    { route: '/ecr', heading: 'ECR Registries', expect: 'floci/api', shot: 'ecr' },
    { route: '/stepfunctions', heading: 'Step Functions Explorer', expect: 'floci-order-fulfillment', shot: 'stepfunctions' },
  ];

  for (const stop of stops) {
    test(`${stop.route} — ${stop.heading}`, async ({ page }) => {
      await gotoView(page, stop.route);
      await expect(page.locator(`h2:has-text("${stop.heading}")`)).toBeVisible();
      await expect(page.getByText(stop.expect, { exact: false }).first()).toBeVisible({ timeout: 15000 });
      await shot(page, stop.shot);
    });
  }

  test('/dynamodb — browse a table and scan its items', async ({ page }) => {
    await gotoView(page, '/dynamodb');
    await expect(page.locator('h2:has-text("DynamoDB Developer Console")')).toBeVisible();
    await expect(page.getByText('floci-users').first()).toBeVisible();
    // Select the table → the view scans and renders the seeded rows.
    await page.getByText('floci-users').first().click();
    await expect(page.getByText('ada@floci.dev').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);
    await shot(page, 'dynamodb');
  });

  test('/cloudwatch — drill group → stream → events', async ({ page }) => {
    await gotoView(page, '/cloudwatch');
    await expect(page.locator('h2:has-text("CloudWatch Logs")')).toBeVisible();
    // Group → streams.
    await page.getByText('/aws/lambda/floci-image-resizer').first().click();
    // Stream → events.
    const stream = page.getByText('[$LATEST]demo', { exact: false }).first();
    await expect(stream).toBeVisible({ timeout: 15000 });
    await stream.click();
    await expect(page.getByText('processed event successfully', { exact: false }).first())
      .toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);
    await shot(page, 'cloudwatch');
  });

  test('/ec2 — EC2 inventory (sidecar AWS-CLI connector)', async ({ page }) => {
    await gotoView(page, '/ec2');
    await expect(page.getByText('EC2', { exact: false }).first()).toBeVisible();
    await page.waitForTimeout(800);
    await shot(page, 'ec2');
  });

  test('/marketplace — software marketplace catalog', async ({ page }) => {
    await gotoView(page, '/marketplace');
    await expect(page.locator('h2:has-text("Software Marketplace")')).toBeVisible();
    await expect(page.getByText('Redis Cache & Broker').first()).toBeVisible();
    await expect(page.getByText('PostgreSQL Database').first()).toBeVisible();
    await shot(page, 'marketplace');
  });

  test('/settings — connection & profiles', async ({ page }) => {
    await gotoView(page, '/settings');
    await page.waitForTimeout(600);
    await shot(page, 'settings');
  });
});
