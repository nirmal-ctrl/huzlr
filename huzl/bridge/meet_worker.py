import asyncio
import logging
import os
import re
from pathlib import Path
from playwright.async_api import Page, TimeoutError
from bridge.meet_states import (
    detect_terminal_meeting_error,
    has_microphone_error,
    is_waiting_for_admission,
)
try:
    from bridge.browser_manager import BrowserManager
except ImportError:
    from huzl.bridge.browser_manager import BrowserManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.meet_worker")


class MeetJoinError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class MeetWorker:
    """Controls the Chromium instance to join Google Meet, configure media, and monitor state."""
    def __init__(self, browser_manager: BrowserManager):
        self.browser_manager = browser_manager
        self.page = None
        self.connected = False
        self.debug_dir = Path(os.environ.get("HUZL_DEBUG_DIR", "."))
        self.debug_dir.mkdir(parents=True, exist_ok=True)

    async def join(self, meeting_url: str, bot_name: str = "huzlr Agent", admission_timeout: int = 180):
        """Navigates to the Google Meet URL, enters name, turns off mic/cam, and joins."""
        if not self.browser_manager.context:
            await self.browser_manager.start()
            
        self.page = await self.browser_manager.context.new_page()
        logger.info(f"Navigating to meeting URL: {meeting_url}")
        await self.page.goto(meeting_url)

        # Let the page load
        await asyncio.sleep(5)
        await self._raise_for_terminal_state()

        # 1. Turn off camera and mic before joining
        logger.info("Configuring green-room settings (disabling camera and mic)...")
        
        await self._ensure_media_off("camera")
        await self._ensure_media_off("microphone")

        await asyncio.sleep(2)

        # 2. Enter bot name
        logger.info(f"Entering bot name: {bot_name}")
        try:
            # Save screenshot of green room for debugging why elements aren't matching
            await self.page.screenshot(path=str(self.debug_dir / "green_room_state.png"))
            logger.info("Saved green_room_state.png screenshot for verification.")

            # Look for name input text field with broader, robust selectors
            # Google Meet's name input usually has placeholder "Your name" or has specifier c-wiz / input
            name_selectors = [
                'input[type="text"]',
                'input[placeholder*="Your name" i]',
                'input[placeholder*="name" i]',
                'input[aria-label*="name" i]',
                '[aria-label*="Your name" i]'
            ]
            
            filled = False
            for sel in name_selectors:
                try:
                    name_input = await self.page.query_selector(sel)
                    if name_input and await name_input.is_visible():
                        await name_input.fill(bot_name)
                        logger.info(f"Filled bot name using selector: '{sel}'")
                        filled = True
                        break
                except Exception:
                    pass
                    
            if not filled:
                logger.warning("Could not find visible name input field. Taking source dump for analysis...")
                html_content = await self.page.content()
                with open(self.debug_dir / "page_source_debug.html", "w") as f:
                    f.write(html_content)
                # Fallback: force fill first visible input
                inputs = await self.page.query_selector_all('input')
                for inp in inputs:
                    if await inp.is_visible():
                        await inp.fill(bot_name)
                        logger.info("Filled first visible general input as fallback name input.")
                        filled = True
                        break

        except Exception as e:
            logger.error(f"Error filling bot name: {e}")
            # Ensure screenshot is saved on exception
            await self.page.screenshot(path=str(self.debug_dir / "error_state.png"))

        await asyncio.sleep(1)

        # 3. Click Join button
        logger.info("Attempting to click Join button...")
        join_controls = [
            self.page.get_by_role("button", name="Join now"),
            self.page.get_by_role("button", name="Ask to join"),
            self.page.get_by_role("button", name="Join meeting"),
            self.page.get_by_role("button", name="Ask to join meeting"),
            self.page.locator('button:has-text("Join now")'),
            self.page.locator('button:has-text("Ask to join")'),
            self.page.locator('button:has-text("Join")'),
        ]

        joined = False
        for control in join_controls:
            try:
                candidate = control.first
                if await candidate.count() and await candidate.is_visible() and await candidate.is_enabled():
                    await candidate.click()
                    logger.info("Successfully clicked active Google Meet join control")
                    joined = True
                    break
            except Exception as e:
                logger.debug("Join control check failed: %s", e)

        if not joined:
            logger.warning("Standard active join buttons not found, scanning all buttons for visibility and join text...")
            try:
                joined = await self.page.evaluate(
                    """() => {
                        const terms = ["join now", "ask to join", "join meeting", "ask to join meeting"];
                        for (const button of document.querySelectorAll('button')) {
                            const text = (button.innerText || button.textContent || button.getAttribute('aria-label') || '').trim().toLowerCase();
                            const rect = button.getBoundingClientRect();
                            const visible = rect.width > 0 && rect.height > 0 && getComputedStyle(button).visibility !== 'hidden';
                            if (visible && !button.disabled && terms.some((term) => text.includes(term))) {
                                button.click();
                                return true;
                            }
                        }
                        return false;
                    }"""
                )
                if joined:
                    logger.info("Fallback clicked visible active join button via DOM scan")
            except Exception as e:
                logger.error(f"Failed fallback visible button click scanner: {e}")

        if not joined:
            await self._raise_for_terminal_state()
            raise MeetJoinError("JOIN_CONTROL_NOT_FOUND", "Google Meet join control was not available")

        logger.info("Join request initiated; waiting for admission confirmation")
        
        # Take a screenshot right after attempting to join to see what state we are in
        try:
            await asyncio.sleep(2)
            await self.page.screenshot(path=str(self.debug_dir / "after_join_attempt.png"))
            logger.info("Saved after_join_attempt.png screenshot for verification.")
            html_content = await self.page.content()
            with open(self.debug_dir / "after_join_debug.html", "w") as f:
                f.write(html_content)
        except Exception as e:
            logger.warning(f"Failed to take post-join debug info: {e}")

        if not await self.wait_until_connected(timeout=admission_timeout):
            raise TimeoutError("ADMISSION_TIMEOUT")

    async def _ensure_media_off(self, media: str):
        """Clicks the off control only when Meet indicates the device is currently on."""
        labels = {
            "camera": '[aria-label*="Turn off camera" i]',
            "microphone": '[aria-label*="Turn off microphone" i]',
        }
        selector = labels[media]
        try:
            control = await self.page.query_selector(selector)
            if control and await control.is_visible():
                await control.click()
                logger.info("Turned off %s", media)
        except Exception as exc:
            logger.warning("Could not verify %s state: %s", media, exc)

    async def wait_until_connected(self, timeout: int = 180) -> bool:
        """Waits until the in-call leave control appears or admission fails."""
        deadline = asyncio.get_running_loop().time() + timeout
        while asyncio.get_running_loop().time() < deadline:
            if await self.is_connected():
                logger.info("Admission confirmed")
                return True

            await self._raise_for_terminal_state()
            await asyncio.sleep(2)
        return False

    async def _raise_for_terminal_state(self):
        body_text = await self.page.locator("body").inner_text()
        error = detect_terminal_meeting_error(body_text)
        if error:
            code, message = error
            try:
                await self.page.screenshot(path=str(self.debug_dir / f"terminal_{code.lower()}.png"))
                with open(self.debug_dir / f"terminal_{code.lower()}.html", "w") as f:
                    f.write(await self.page.content())
                logger.info("Saved terminal meeting state artifacts for %s", code)
            except Exception as exc:
                logger.warning("Failed to save terminal meeting state artifacts: %s", exc)
            raise MeetJoinError(code, message)

    async def is_connected(self) -> bool:
        """Checks if the meeting page is active and the call is in progress."""
        if not self.page or self.page.is_closed():
            self.connected = False
            return False

        try:
            body_text = await self.page.locator("body").inner_text()
            if is_waiting_for_admission(body_text):
                self.connected = False
                return False
        except Exception as exc:
            logger.debug("Could not inspect admission text: %s", exc)
            
        # If we see elements specific to being inside a meeting (like the hang up button)
        try:
            # Common Google Meet elements when inside a meeting:
            # - Leave call button (aria-label "Leave call")
            # - Meeting details or participants list
            hangup_btn = await self.page.query_selector('[aria-label*="Leave call" i]')
            if hangup_btn and await hangup_btn.is_visible():
                self.connected = True
                return True
        except Exception:
            pass
            
        self.connected = False
        return False

    async def unmute(self):
        """Unmutes the Google Meet mic so participants can hear injected audio."""
        if not self.page:
            raise MeetJoinError("MICROPHONE_UNMUTE_FAILED", "Google Meet page is not available")

        body_text = await self.page.locator("body").inner_text()
        if has_microphone_error(body_text):
            await self.page.screenshot(path=str(self.debug_dir / "microphone_unavailable.png"))
            raise MeetJoinError(
                "MICROPHONE_NOT_FOUND",
                "Chromium could not open the huzlr virtual microphone",
            )

        logger.info("Unmuting bot in Google Meet...")
        controls = [
            self.page.get_by_role("button", name=re.compile(r"turn on (microphone|mic)", re.IGNORECASE)),
            self.page.locator('[role="button"][aria-label*="Turn on microphone" i]'),
            self.page.locator('[role="button"][aria-label*="Turn on mic" i]'),
        ]
        clicked = False
        for control in controls:
            for index in range(await control.count()):
                candidate = control.nth(index)
                if await candidate.is_visible() and await candidate.is_enabled():
                    await candidate.click()
                    clicked = True
                    break
            if clicked:
                break

        if not clicked:
            logger.warning("Visible microphone control not found; trying Google Meet keyboard shortcut")
            await self.page.keyboard.press("Control+d")

        enabled = False
        deadline = asyncio.get_running_loop().time() + 5
        off_controls = self.page.locator(
            '[role="button"][aria-label*="Turn off microphone" i], '
            '[role="button"][aria-label*="Turn off mic" i]'
        )
        while asyncio.get_running_loop().time() < deadline and not enabled:
            for index in range(await off_controls.count()):
                if await off_controls.nth(index).is_visible():
                    enabled = True
                    break
            if not enabled:
                await asyncio.sleep(0.25)
        if not enabled:
            await self.page.screenshot(path=str(self.debug_dir / "microphone_unmute_failed.png"))
            raise MeetJoinError(
                "MICROPHONE_UNMUTE_FAILED",
                "Google Meet did not enable the bot microphone",
            )

        body_text = await self.page.locator("body").inner_text()
        if has_microphone_error(body_text):
            await self.page.screenshot(path=str(self.debug_dir / "microphone_unavailable.png"))
            raise MeetJoinError(
                "MICROPHONE_NOT_FOUND",
                "Chromium could not open the huzlr virtual microphone",
            )

        await self.page.screenshot(path=str(self.debug_dir / "microphone_unmuted.png"))
        logger.info("Verified Google Meet microphone is unmuted")

    async def mute(self):
        """Mutes the Google Meet mic."""
        if self.page:
            logger.info("Muting bot in Google Meet...")
            await self._ensure_media_off("microphone")

    async def leave(self):
        """Leaves the meeting cleanly."""
        logger.info("Leaving Google Meet session...")
        if self.page:
            try:
                hangup_btn = await self.page.query_selector('[aria-label*="Leave call" i]')
                if hangup_btn:
                    await hangup_btn.click()
                    logger.info("Clicked Hang Up/Leave Button.")
                else:
                    await self.page.close()
            except Exception as e:
                logger.error(f"Error leaving meeting: {e}")
        self.connected = False
