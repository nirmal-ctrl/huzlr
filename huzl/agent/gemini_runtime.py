import os
import logging
import asyncio
import google.generativeai as genai
from typing import AsyncGenerator

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("huzl.gemini_runtime")

class GeminiRuntime:
    """Manages connection, prompts, and streaming responses from Gemini 1.5 / 2.0 / 3.1 Flash."""
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Gemini calls will fail unless configured via environment.")
        else:
            genai.configure(api_key=self.api_key)
            
        # Standard system instructions for our AI project manager agent
        self.system_instruction = (
            "You are huzlr, an autonomous AI project manager agent joining a Google Meet call. "
            "Your job is to listen carefully to the participants, speak naturally and concisely, "
            "provide status updates, track blockers, and help coordinate tasks. "
            "Keep your responses short, conversational, and project-focused (similar to human speech in meetings). "
            "Do not output markdown formatting like asterisks or bullet points since your response is spoken directly."
        )
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",  # Or gemini-2.0-flash / 2.5-flash
            system_instruction=self.system_instruction
        )

    async def generate_response_stream(self, conversation_history: list) -> AsyncGenerator[str, None]:
        """Generates a text token stream from Gemini based on conversation history."""
        logger.info("Requesting streaming completion from Gemini Flash...")
        try:
            # We run the synchronous streaming method in an executor to avoid blocking the event loop
            loop = asyncio.get_running_loop()
            
            def call_gemini():
                return self.model.generate_content(
                    contents=conversation_history,
                    stream=True
                )
                
            response = await loop.run_in_executor(None, call_gemini)
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    # Yield control to allow event loop task interleaving
                    await asyncio.sleep(0.001)
                    
        except Exception as e:
            logger.error(f"Error during Gemini streaming: {e}")
            yield f"I'm sorry, I encountered an error coordinating with Gemini: {str(e)}"
