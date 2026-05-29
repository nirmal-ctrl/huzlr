import numpy as np
import logging
from typing import Callable

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.interruption_manager")

class InterruptionManager:
    """Provides high-speed, zero-dependency VAD (Volume/RMS threshold based) to detect voice interruptions in raw streams."""
    def __init__(self, threshold_db: float = -35.0, min_silent_chunks: int = 15):
        self.threshold_db = threshold_db
        # Volume calibration and voice signal thresholds
        self.min_silent_chunks = min_silent_chunks
        self.consecutive_voice_chunks = 0
        self.consecutive_silent_chunks = 0

    def calculate_rms_db(self, pcm_chunk: bytes) -> float:
        """Calculates root-mean-square amplitude in decibels (relative to full scale)."""
        if not pcm_chunk:
            return -100.0
            
        samples = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0
        if len(samples) == 0:
            return -100.0
            
        rms = np.sqrt(np.mean(samples ** 2))
        if rms == 0:
            return -100.0
            
        db = 20 * np.log10(rms)
        return float(db)

    def is_voice_active(self, pcm_chunk: bytes) -> bool:
        """Evaluates whether the 20ms PCM chunk contains speech based on configured DB threshold."""
        db = self.calculate_rms_db(pcm_chunk)
        
        if db > self.threshold_db:
            self.consecutive_voice_chunks += 1
            self.consecutive_silent_chunks = 0
            # If we get at least 2 consecutive vocal chunks (40ms), declare voice activity
            if self.consecutive_voice_chunks >= 2:
                return True
        else:
            self.consecutive_silent_chunks += 1
            if self.consecutive_silent_chunks >= self.min_silent_chunks:
                self.consecutive_voice_chunks = 0
                
        return False
