import asyncio
import logging
from playwright.async_api import Page, TimeoutError
try:
    from bridge.browser_manager import BrowserManager
except ImportError:
    from huzl.bridge.browser_manager import BrowserManager

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.meet_worker")

class MeetWorker:
    """Controls the Chromium instance to join Google Meet, configure media, and monitor state."""
    def __init__(self, browser_manager: BrowserManager):
        self.browser_manager = browser_manager
        self.page = None
        self.connected = False

    async def join(self, meeting_url: str, bot_name: str = "Huzlr Agent"):
        """Navigates to the Google Meet URL, enters name, turns off mic/cam, and joins."""
        if not self.browser_manager.context:
            await self.browser_manager.start()
            
        self.page = await self.browser_manager.context.new_page()
        logger.info(f"Navigating to meeting URL: {meeting_url}")
        await self.page.goto(meeting_url)

        # Let the page load
        await asyncio.sleep(5)

        # 1. Turn off camera and mic before joining
        logger.info("Configuring green-room settings (disabling camera and mic)...")
        
        # Turn off camera
        try:
            # We can use keyboard shortcuts: Cmd+E or Ctrl+E is Google Meet shortcut for camera toggle
            await self.page.keyboard.press("Control+e")
            logger.info("Sent shortcut to toggle camera off")
        except Exception as e:
            logger.warning(f"Failed to turn off camera via shortcut: {e}")

        # Turn off microphone
        try:
            # Cmd+D or Ctrl+D is Google Meet shortcut for microphone toggle
            await self.page.keyboard.press("Control+d")
            logger.info("Sent shortcut to toggle microphone off")
        except Exception as e:
            logger.warning(f"Failed to turn off microphone via shortcut: {e}")

        await asyncio.sleep(2)

        # 2. Enter bot name
        logger.info(f"Entering bot name: {bot_name}")
        try:
            # Save screenshot of green room for debugging why elements aren't matching
            await self.page.screenshot(path="green_room_state.png")
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
                with open("page_source_debug.html", "w") as f:
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
            await self.page.screenshot(path="error_state.png")

        await asyncio.sleep(1)

        # 3. Click Join button
        logger.info("Attempting to click Join button...")
        join_selectors = [
            'button:has-text("Ask to join")',
            'button:has-text("Join now")',
            'button:has-text("Join")',
            'button:has-text("Ask to join meeting")',
            'button:has-text("Join meeting")'
        ]

        joined = False
        for selector in join_selectors:
            try:
                btn = await self.page.query_selector(selector)
                if btn and await btn.is_visible() and await btn.is_enabled():
                    await btn.click()
                    logger.info(f"Successfully clicked active join button using selector: '{selector}'")
                    joined = True
                    break
                elif btn:
                    logger.debug(f"Found selector '{selector}' but it was not visible/enabled.")
            except Exception as e:
                logger.debug(f"Selector {selector} check failed: {e}")

        if not joined:
            logger.warning("Standard active join buttons not found, scanning all buttons for visibility and join text...")
            try:
                buttons = await self.page.query_selector_all('button')
                for btn in buttons:
                    text = await btn.inner_text()
                    if any(term in text.lower() for term in ["join", "ask to join", "join now", "ask"]):
                        if await btn.is_visible() and await btn.is_enabled():
                            await btn.click()
                            logger.info(f"Fallback clicked visible active button containing '{text.strip()}'")
                            joined = True
                            break
            except Exception as e:
                logger.error(f"Failed fallback visible button click scanner: {e}")

        self.connected = joined
        logger.info(f"Join request initiated. Connection status: {self.connected}")
        
        # Take a screenshot right after attempting to join to see what state we are in
        try:
            await asyncio.sleep(2)
            await self.page.screenshot(path="after_join_attempt.png")
            logger.info("Saved after_join_attempt.png screenshot for verification.")
            html_content = await self.page.content()
            with open("after_join_debug.html", "w") as f:
                f.write(html_content)
        except Exception as e:
            logger.warning(f"Failed to take post-join debug info: {e}")

    async def is_connected(self) -> bool:
        """Checks if the meeting page is active and the call is in progress."""
        if not self.page or self.page.is_closed():
            self.connected = False
            return False
            
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
        if self.page:
            logger.info("Unmuting bot in Google Meet...")
            await self.page.keyboard.press("Control+d")

    async def mute(self):
        """Mutes the Google Meet mic."""
        if self.page:
            logger.info("Muting bot in Google Meet...")
            await self.page.keyboard.press("Control+d")

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
