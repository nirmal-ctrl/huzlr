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
    def __init__(self, device_name: str = "huzlr_Virtual_Microphone", sample_rate: int = 16000, channels: int = 1):
        self.device_name = device_name
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_duration = 0.020  # 20ms chunks
        self.blocksize = int(self.sample_rate * self.chunk_duration)  # 320 samples
        self.play_queue = queue.Queue()
        self.stream = None
        self.is_injecting = False
        self._pending_samples = np.empty(0, dtype=np.float32)

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
        """Audio callback to fill the playback buffer from the queue."""
        if status:
            logger.warning(f"Audio injection status: {status}")
            
        # Initialize outdata with silence
        outdata.fill(0)
        
        filled_frames = 0
        if len(self._pending_samples):
            to_take = min(len(self._pending_samples), frames)
            outdata[:to_take, 0] = self._pending_samples[:to_take]
            self._pending_samples = self._pending_samples[to_take:]
            filled_frames = to_take
        while filled_frames < frames:
            try:
                # Try to get a chunk from the queue
                raw_chunk = self.play_queue.get_nowait()
                
                # Convert 16-bit PCM bytes to float32
                chunk_samples = np.frombuffer(raw_chunk, dtype=np.int16).astype(np.float32) / 32768.0
                
                # How many samples can we take from this chunk?
                remaining_frames = frames - filled_frames
                to_take = min(len(chunk_samples), remaining_frames)
                
                # Fill the buffer
                outdata[filled_frames : filled_frames + to_take, 0] = chunk_samples[:to_take]
                filled_frames += to_take
                
                if to_take < len(chunk_samples):
                    self._pending_samples = chunk_samples[to_take:]

            except queue.Empty:
                # No more data in queue, stop filling
                break

    def write_chunk(self, pcm_chunk: bytes):
        """Pushes a 16-bit PCM audio chunk (any size) to be injected."""
        if not self.is_injecting:
            logger.warning("Cannot write chunk, injection stream is not active.")
            return
            
        if pcm_chunk:
            self.play_queue.put(pcm_chunk)

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

    def clear_buffer(self):
        """Clears all pending audio chunks in the injection buffer (used during interruptions)."""
        logger.info("Clearing playback queue (interruption received).")
        while not self.play_queue.empty():
            try:
                self.play_queue.get_nowait()
            except queue.Empty:
                break
        self._pending_samples = np.empty(0, dtype=np.float32)

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
