import logging
import time
from typing import Dict, Callable

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.conversation_manager")

# Standard Conversation States
STATE_IDLE = "IDLE"
STATE_LISTENING = "LISTENING"
STATE_THINKING = "THINKING"
STATE_SPEAKING = "SPEAKING"
STATE_INTERRUPTED = "INTERRUPTED"

class ConversationManager:
    """Manages the agent's real-time conversation state machine, coordinating speech and interruptions."""
    def __init__(self, on_interruption: Callable = None):
        self._current_state = STATE_IDLE
        self.on_interruption_callback = on_interruption
        self.last_state_change = time.time()
        
        # State Transition Registry (Maps states to descriptive handler comments/logic)
        # Bypasses complex if-else logic per backend standards
        self.state_handlers: Dict[str, Callable] = {
            STATE_IDLE: self._handle_idle,
            STATE_LISTENING: self._handle_listening,
            STATE_THINKING: self._handle_thinking,
            STATE_SPEAKING: self._handle_speaking,
            STATE_INTERRUPTED: self._handle_interrupted
        }

    @property
    def current_state(self) -> str:
        return self._current_state

    def set_state(self, new_state: str):
        """Sets the state of the conversation and fires the respective handler."""
        if new_state not in self.state_handlers:
            logger.error(f"Invalid state transition attempted: {new_state}")
            return
            
        logger.info(f"Conversation State Transition: {self._current_state} -> {new_state}")
        self._current_state = new_state
        self.last_state_change = time.time()
        self.state_handlers[new_state]()

    def detect_interruption(self, is_user_speaking: bool):
        """Called when real-time VAD detects user vocal activity."""
        # If the agent is currently speaking but a user starts talking, we trigger an interruption immediately
        if self._current_state == STATE_SPEAKING and is_user_speaking:
            logger.info("INTERRUPTION DETECTED! User began talking while agent was speaking.")
            self.set_state(STATE_INTERRUPTED)
            if self.on_interruption_callback:
                self.on_interruption_callback()

    def _handle_idle(self):
        logger.info("Agent is now IDLE. Waiting for audio activation.")

    def _handle_listening(self):
        logger.info("Agent is actively LISTENING to incoming Google Meet audio...")

    def _handle_thinking(self):
        logger.info("Agent is THINKING/generating response via Gemini Flash...")

    def _handle_speaking(self):
        logger.info("Agent is SPEAKING. Injecting synthesized TTS stream into Google Meet.")

    def _handle_interrupted(self):
        logger.warning("Agent was INTERRUPTED. Cancelling generation, clearing output streams, and returning to LISTENING.")
        # Auto-reset state back to listening after short recovery window
        self.set_state(STATE_LISTENING)
