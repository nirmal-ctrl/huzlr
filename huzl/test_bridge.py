import asyncio
import os
import sys
import logging
import numpy as np

# Add parent directories to path for imports to work nicely
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bridge.browser_manager import BrowserManager
from bridge.meet_worker import MeetWorker
from bridge.audio_capture import AudioCapturePipeline
from bridge.audio_injection import AudioInjectionPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.test_bridge")

async def test_integration():
    # Google Meet URL to join (Replace with your actual test URL!)
    test_meet_url = os.environ.get("TEST_MEET_URL", "https://meet.google.com/abc-defg-hij")
    
    logger.info("=========================================")
    logger.info("   HUZLR GOOGLE MEET BRIDGE TEST SUITE   ")
    logger.info("=========================================")
    logger.info(f"Target Google Meet URL: {test_meet_url}")

    # 1. Initialize Browser Manager and Meet Worker
    browser = BrowserManager()
    worker = MeetWorker(browser)

    # 2. Initialize Audio Capture and Audio Injection Pipelines
    capture = AudioCapturePipeline(device_name="Huzlr_Virtual_Speaker")
    injection = AudioInjectionPipeline(device_name="Huzlr_Virtual_Microphone")

    try:
        # 3. Launch and Join
        logger.info("STEP 1: Launching browser & joining Google Meet...")
        await worker.join(meeting_url=test_meet_url, bot_name="Huzlr Test Bot")
        
        # Allow extra time to enter and connect
        await asyncio.sleep(8)
        
        is_active = await worker.is_connected()
        logger.info(f"Green room passed and connected inside meeting: {is_active}")

        # 4. Start Capture Stream and Record sound
        logger.info("STEP 2: Activating Audio Capture Pipeline...")
        capture.start()
        
        # Capture chunks for 5 seconds and calculate signal level (RMS) to prove audio extraction
        logger.info("Listening to meeting audio for 5 seconds to analyze volume level...")
        for i in range(250):  # 250 * 20ms = 5000ms
            chunk = capture.read_chunk(timeout=0.1)
            if chunk and i % 50 == 0:  # Log occasionally
                samples = np.frombuffer(chunk, dtype=np.int16).astype(np.float32) / 32768.0
                rms = np.sqrt(np.mean(samples ** 2))
                db = 20 * np.log10(rms) if rms > 0 else -100
                logger.info(f"Captured chunk {i} - Signal level: {db:.2f} dB")
            await asyncio.sleep(0.02)
            
        capture.stop()

        # 5. Unmute and Start Injection Stream
        logger.info("STEP 3: Unmuting and Injecting test audio...")
        await worker.unmute()
        injection.start()

        # Create a basic 440Hz sine wave tone to inject for 3 seconds as a test audio signal
        logger.info("Injecting a 440Hz synthesized audio tone into Google Meet...")
        sample_rate = 16000
        duration_sec = 3.0
        t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
        tone_samples = np.sin(2 * np.pi * 440 * t)
        # Convert float32 back to PCM 16-bit bytes
        tone_bytes = (tone_samples * 32767).astype(np.int16).tobytes()

        # Write tone in 20ms chunks (320 samples / 640 bytes per chunk)
        chunk_size = 640
        for i in range(0, len(tone_bytes), chunk_size):
            chunk = tone_bytes[i:i+chunk_size]
            if len(chunk) == chunk_size:
                injection.write_chunk(chunk)
                await asyncio.sleep(0.018)  # Interleave chunk writes slightly under 20ms to prevent gaps

        logger.info("Tone injection completed. Participants should have heard a clean 3s beep.")
        injection.stop()

    except Exception as e:
        logger.error(f"Test encountered an error: {e}", exc_info=True)
    finally:
        # 6. Teardown
        logger.info("STEP 4: Cleaning up browser instance and leaving meeting...")
        await worker.leave()
        await browser.stop()
        logger.info("Test execution finished.")

if __name__ == "__main__":
    asyncio.run(test_integration())
