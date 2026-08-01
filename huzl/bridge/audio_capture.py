import sounddevice as sd
import numpy as np
import logging
import wave
import queue
import threading

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.audio_capture")

class AudioCapturePipeline:
    """Captures real-time audio from the designated virtual speaker output channel."""
    def __init__(self, device_name: str = "huzlr_Virtual_Speaker", sample_rate: int = 16000, channels: int = 1):
        self.device_name = device_name
        self.sample_rate = sample_rate
        self.channels = channels
        self.chunk_duration = 0.020  # 20ms chunks
        self.blocksize = int(self.sample_rate * self.chunk_duration)  # e.g., 320 samples
        self.audio_queue = queue.Queue()
        self.stream = None
        self.is_capturing = False

    def _find_device_index(self) -> int:
        """Finds the device index matching the virtual device name."""
        devices = sd.query_devices()
        for idx, dev in enumerate(devices):
            if self.device_name.lower() in dev["name"].lower():
                logger.info(f"Found match for '{self.device_name}': device index {idx} ({dev['name']})")
                return idx
        logger.warning(f"Device '{self.device_name}' not found. Defaulting to system default input.")
        return None

    def _audio_callback(self, indata, frames, time, status):
        if status:
            logger.warning(f"Audio stream status: {status}")
        # Convert floating array to 16-bit PCM bytes
        pcm_data = (indata * 32767).astype(np.int16).tobytes()
        self.audio_queue.put(pcm_data)

    def start(self):
        """Starts the audio capture stream."""
        if self.is_capturing:
            logger.warning("Capture pipeline already running.")
            return

        device_idx = self._find_device_index()
        logger.info(f"Starting audio capture stream (Rate: {self.sample_rate}Hz, Blocksize: {self.blocksize})...")
        self.is_capturing = True
        self.stream = sd.InputStream(
            device=device_idx,
            channels=self.channels,
            samplerate=self.sample_rate,
            blocksize=self.blocksize,
            dtype="float32",
            callback=self._audio_callback
        )
        self.stream.start()

    def read_chunk(self, timeout: float = None) -> bytes:
        """Reads a captured 20ms PCM chunk from the queue (blocking)."""
        try:
            return self.audio_queue.get(timeout=timeout)
        except queue.Empty:
            return b""

    def stop(self):
        """Stops the audio capture stream cleanly."""
        logger.info("Stopping audio capture stream...")
        self.is_capturing = False
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        logger.info("Audio capture stopped.")

    def record_to_wav(self, file_path: str, duration_sec: float = 5.0):
        """Debug helper to record a clip of captured audio to a local WAV file."""
        logger.info(f"Recording {duration_sec}s of meeting audio to {file_path}...")
        self.start()
        
        frames = []
        num_chunks = int(duration_sec / self.chunk_duration)
        for _ in range(num_chunks):
            chunk = self.read_chunk()
            if chunk:
                frames.append(chunk)

        self.stop()

        with wave.open(file_path, "wb") as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(self.sample_rate)
            wf.writeframes(b"".join(frames))
        logger.info(f"Recording saved to {file_path}")
