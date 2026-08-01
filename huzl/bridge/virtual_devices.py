import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.virtual_devices")

def setup_linux_devices():
    """Sets up PulseAudio / PipeWire virtual speaker and virtual microphone on Linux."""
    logger.info("Setting up virtual audio devices for Linux...")
    
    # Check if pactl exists
    try:
        subprocess.run(["which", "pactl"], check=True, stdout=subprocess.PIPE)
    except subprocess.CalledProcessError:
        logger.error("pactl command not found. Please install pulseaudio-utils or pipewire-pulse.")
        return False

    # Create huzlr Speaker
    logger.info("Creating 'huzlr Virtual Speaker'...")
    cmd_speaker = [
        "pactl", "load-module", "module-null-sink",
        "sink_name=huzlr_Speaker",
        'sink_properties=device.description="huzlr_Virtual_Speaker"'
    ]
    try:
        subprocess.run(cmd_speaker, check=True)
        logger.info("Successfully loaded huzlr Virtual Speaker!")
    except subprocess.CalledProcessError as e:
        logger.warning(f"Failed to load speaker sink. It might already exist or permission denied: {e}")

    # Create huzlr Microphone (a null sink, then we loopback or use its monitor)
    logger.info("Creating 'huzlr Virtual Microphone'...")
    cmd_mic = [
        "pactl", "load-module", "module-null-sink",
        "sink_name=huzlr_Mic",
        'sink_properties=device.description="huzlr_Virtual_Microphone"'
    ]
    try:
        subprocess.run(cmd_mic, check=True)
        logger.info("Successfully loaded huzlr Virtual Microphone sink!")
    except subprocess.CalledProcessError as e:
        logger.warning(f"Failed to load microphone sink: {e}")

    return True

def setup_macos_info():
    """Provides information on how to configure virtual audio devices on macOS."""
    logger.info("--- macOS Virtual Audio Device Setup ---")
    logger.info("On macOS, virtual loopback requires BlackHole or Loopback.")
    logger.info("We recommend installing BlackHole via Homebrew:")
    logger.info("  brew install blackhole-2ch")
    logger.info("  brew install blackhole-16ch")
    logger.info("After installation:")
    logger.info("  - Set 'BlackHole 2ch' as input and output devices for your streams.")
    logger.info("---------------------------------------")

def setup():
    platform = sys.platform
    if platform.startswith("linux"):
        setup_linux_devices()
    elif platform == "darwin":
        setup_macos_info()
    else:
        logger.warning(f"Unsupported OS platform for auto-setup: {platform}")

if __name__ == "__main__":
    setup()
