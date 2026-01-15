import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function takeScreenshot() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to standard desktop size
  await page.setViewportSize({ width: 1920, height: 1080 });

  console.log('📱 Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Wait for layout to settle
  await page.waitForTimeout(2000);

  // Take full page screenshot
  const screenshotPath = join(__dirname, 'layout-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✅ Screenshot saved to: ${screenshotPath}`);

  // Also capture diagnostic info
  const diagnostic = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll('[data-panel]'));
    const groups = Array.from(document.querySelectorAll('[data-panel-group]'));

    return {
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      panels: panels.map((panel, i) => {
        const rect = panel.getBoundingClientRect();
        return {
          index: i,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        };
      }),
      groups: groups.map((group, i) => {
        const rect = group.getBoundingClientRect();
        return {
          index: i,
          orientation: group.getAttribute('data-panel-group-direction'),
          width: rect.width,
          height: rect.height,
          childCount: group.children.length,
        };
      }),
    };
  });

  console.log('\n📊 Layout Diagnostic:');
  console.log(JSON.stringify(diagnostic, null, 2));

  await browser.close();
  console.log('\n✨ Done! Screenshot saved to layout-screenshot.png');
  console.log('You can now analyze the visual layout issue.');
}

takeScreenshot().catch(console.error);
