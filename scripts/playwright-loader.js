const bundledNodeModules = "/Users/peterv999/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (localError) {
    try {
      return require(`${process.env.PLAYWRIGHT_NODE_MODULES || bundledNodeModules}/playwright`);
    } catch {
      console.error("Playwright is required for this test. Run: npm install --save-dev playwright && npx playwright install chromium");
      throw localError;
    }
  }
}

module.exports = loadPlaywright();
