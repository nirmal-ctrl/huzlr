import asyncio
import logging
import os
from pathlib import Path
from playwright.async_api import async_playwright, BrowserContext, Page

from bridge.google_auth import has_google_auth_cookies

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.browser_manager")


class BotAuthenticationError(RuntimeError):
    code = "BOT_AUTHENTICATION_REQUIRED"


class BrowserManager:
    """Manages the lifecycle of the Playwright Chromium browser with specific flags for audio routing."""
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.storage_state_path = None

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
        storage_state_value = os.environ.get("BOT_STORAGE_STATE_PATH", "").strip()
        require_profile = os.environ.get("REQUIRE_BOT_PROFILE", "false").lower() == "true"
        if require_profile and not (profile_dir or storage_state_value):
            raise BotAuthenticationError(
                "BOT_PROFILE_DIR or BOT_STORAGE_STATE_PATH is required for dedicated bot authentication"
            )

        launch_options = {
            "headless": headless_option,
            "args": chrome_args,
            # Playwright adds --mute-audio to headless Chromium by default.
            # The Meet bridge must render remote participant audio into the
            # virtual speaker sink so AudioCapturePipeline can publish it.
            "ignore_default_args": ["--mute-audio"],
        }
        context_options = {
            "permissions": ["microphone", "camera"],
            "viewport": {"width": 1280, "height": 800},
        }
        executable_path = os.environ.get("CHROME_EXECUTABLE_PATH")
        if executable_path:
            if not Path(executable_path).is_file():
                raise RuntimeError(f"CHROME_EXECUTABLE_PATH does not exist: {executable_path}")
            launch_options["executable_path"] = executable_path

        if storage_state_value:
            storage_state_path = Path(storage_state_value)
            if not storage_state_path.is_file():
                raise BotAuthenticationError(
                    f"Google authentication state does not exist: {storage_state_path}. "
                    "Run provision_bot_profile.py before starting the worker."
                )
            self.storage_state_path = storage_state_path
            self.browser = await self.playwright.chromium.launch(**launch_options)
            self.context = await self.browser.new_context(
                storage_state=str(storage_state_path),
                **context_options,
            )
            logger.info("Chromium launched with portable Google authentication state")
        elif profile_dir:
            self.context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=profile_dir,
                **launch_options,
                **context_options,
            )
            logger.info("Chromium launched with persistent bot profile")
        else:
            self.browser = await self.playwright.chromium.launch(**launch_options)
            self.context = await self.browser.new_context(**context_options)
            logger.warning("Chromium launched without a persistent bot profile")

        if require_profile or storage_state_value:
            await self._verify_google_authentication()
        
        logger.info("Chromium launched successfully")
        return self.context

    async def _verify_google_authentication(self):
        cookies = await self.context.cookies()
        if not has_google_auth_cookies(cookies):
            raise BotAuthenticationError(
                "The worker browser is not signed in to Google. Run provision_bot_profile.py "
                "and restart the worker."
            )
        logger.info("Verified authenticated Google browser session")

    async def stop(self):
        logger.info("Stopping Playwright browser...")
        if self.context:
            if self.storage_state_path:
                try:
                    await self.context.storage_state(path=str(self.storage_state_path))
                    logger.info("Updated portable Google authentication state")
                except Exception as exc:
                    logger.warning("Could not persist Google authentication state: %s", exc)
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("Browser stopped completely.")
