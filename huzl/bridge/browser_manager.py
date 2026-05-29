import asyncio
import logging
from playwright.async_api import async_playwright, BrowserContext, Page

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.browser_manager")

class BrowserManager:
    """Manages the lifecycle of the Playwright Chromium browser with specific flags for audio routing."""
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None

    async def start(self) -> BrowserContext:
        logger.info("Initializing Playwright and launching Chromium...")
        self.playwright = await async_playwright().start()
        
        # Standard Chromium args for audio/mic automation and virtual pipelines
        chrome_args = [
            "--use-fake-ui-for-media-stream",  # Bypasses mic/cam permission prompts automatically
            "--autoplay-policy=no-user-gesture-required",  # Autoplays meeting audio without click
            "--disable-features=AudioServiceSandbox",  # Allows audio driver interfacing
            "--use-fake-device-for-media-stream",  # Fake camera if needed
        ]

        import os
        # Run headless in Docker unless overridden; headless=False is good for local debugging
        is_docker = os.path.exists("/.dockerenv")
        headless_option = os.environ.get("HEADLESS", "true" if is_docker else "false").lower() == "true"
        logger.info(f"Launching Chromium with headless={headless_option} (is_docker={is_docker})")

        self.browser = await self.playwright.chromium.launch(
            headless=headless_option,
            args=chrome_args
        )
        
        # Set a realistic user agent and modern desktop viewport to bypass bot detection walls
        user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        
        self.context = await self.browser.new_context(
            permissions=["microphone", "camera"],
            user_agent=user_agent,
            viewport={"width": 1280, "height": 800}
        )
        
        # Bypasses navigator.webdriver check to hide the automation driver
        await self.context.add_init_script("delete navigator.__proto__.webdriver;")
        
        logger.info("Chromium launched successfully with custom User-Agent and webdriver stealth bypass.")
        return self.context

    async def stop(self):
        logger.info("Stopping Playwright browser...")
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser stopped completely.")
