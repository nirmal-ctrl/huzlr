import asyncio
import logging
import os
from pathlib import Path
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
        ]

        if os.environ.get("USE_FAKE_MEDIA_DEVICE", "false").lower() == "true":
            chrome_args.append("--use-fake-device-for-media-stream")

        # Run headless in Docker unless overridden; headless=False is good for local debugging
        is_docker = os.path.exists("/.dockerenv")
        headless_option = os.environ.get("HEADLESS", "true" if is_docker else "false").lower() == "true"
        logger.info(f"Launching Chromium with headless={headless_option} (is_docker={is_docker})")

        profile_dir = os.environ.get("BOT_PROFILE_DIR")
        require_profile = os.environ.get("REQUIRE_BOT_PROFILE", "false").lower() == "true"
        if require_profile and not profile_dir:
            raise RuntimeError("BOT_PROFILE_DIR is required for dedicated bot authentication")

        context_options = {
            "headless": headless_option,
            "args": chrome_args,
            "permissions": ["microphone", "camera"],
            "viewport": {"width": 1280, "height": 800},
        }
        executable_path = os.environ.get("CHROME_EXECUTABLE_PATH")
        if executable_path:
            if not Path(executable_path).is_file():
                raise RuntimeError(f"CHROME_EXECUTABLE_PATH does not exist: {executable_path}")
            context_options["executable_path"] = executable_path

        if profile_dir:
            Path(profile_dir).mkdir(parents=True, exist_ok=True)
            self.context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=profile_dir,
                **context_options,
            )
            logger.info("Chromium launched with persistent bot profile")
        else:
            self.browser = await self.playwright.chromium.launch(
                headless=headless_option,
                args=chrome_args,
                executable_path=executable_path,
            )
            self.context = await self.browser.new_context(
                permissions=["microphone", "camera"],
                viewport={"width": 1280, "height": 800},
            )
            logger.warning("Chromium launched without a persistent bot profile")
        
        logger.info("Chromium launched successfully")
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
