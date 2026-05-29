import sounddevice as sd
import numpy as np
import logging
import queue
import threading
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.audio_injection")

class AudioInjectionPipeline:
    """Injects real-time PCM audio chunks into the designated virtual microphone channel."""
    def __init__(self, device_name: str = "Huzlr_Virtual_Microphone", sample_rate: int = 16000, channels: int = 1):
        self.device_name = device_name
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_duration = 0.020  # 20ms chunks
        self.blocksize = int(self.sample_rate * self.chunk_duration)  # 320 samples
        self.play_queue = queue.Queue()
        self.stream = None
        self.is_injecting = False

    def _find_device_index(self) -> int:
        """Finds the device index matching the virtual microphone name."""
        devices = sd.query_devices()
        for idx, dev in enumerate(devices):
            if self.device_name.lower() in dev["name"].lower():
                logger.info(f"Found match for '{self.device_name}': device index {idx} ({dev['name']})")
                return idx
        logger.warning(f"Device '{self.device_name}' not found. Defaulting to system default output.")
        return None

    def _audio_callback(self, outdata, frames, time_info, status):
        if status:
            logger.warning(f"Audio injection status: {status}")
        try:
            # Try to get the next chunk from the queue
            # Since each callback asks for 'frames' (e.g., 320), we should pull that many samples
            raw_chunk = self.play_queue.get_nowait()
            # Convert 16-bit PCM bytes back to float32
            samples = np.frombuffer(raw_chunk, dtype=np.int16).astype(np.float32) / 32767.0
            
            # Ensure correct size
            if len(samples) < frames:
                # Pad with zeros if chunk is too small
                padded = np.zeros(frames, dtype=np.float32)
                padded[:len(samples)] = samples
                samples = padded
            elif len(samples) > frames:
                # Truncate if too long
                samples = samples[:frames]
                
            outdata[:, 0] = samples
        except queue.Empty:
            # Fill with silent samples if queue is empty to avoid noise/buffer clicks
            outdata.fill(0)

    def start(self):
        """Starts the audio injection output stream."""
        if self.is_injecting:
            logger.warning("Injection pipeline already running.")
            return

        device_idx = self._find_device_index()
        logger.info(f"Starting audio injection stream (Rate: {self.sample_rate}Hz, Blocksize: {self.blocksize})...")
        self.is_injecting = True
        self.stream = sd.OutputStream(
            device=device_idx,
            channels=self.channels,
            samplerate=self.sample_rate,
            blocksize=self.blocksize,
            dtype="float32",
            callback=self._audio_callback
        )
        self.stream.start()

    def write_chunk(self, pcm_chunk: bytes):
        """Pushes a 20ms 16-bit PCM audio chunk to be injected."""
        if self.is_injecting:
            self.play_queue.put(pcm_chunk)
        else:
            logger.warning("Cannot write chunk, injection stream is not active.")

    def clear_buffer(self):
        """Clears all pending audio chunks in the injection buffer (used during interruptions)."""
        logger.info("Clearing playback queue (interruption received).")
        while not self.play_queue.empty():
            try:
                self.play_queue.get_nowait()
            except queue.Empty:
                break

    def stop(self):
        """Stops the audio injection stream."""
        logger.info("Stopping audio injection stream...")
        self.is_injecting = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.clear_buffer()
        logger.info("Audio injection stopped.")
