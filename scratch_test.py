import asyncio
import os
import json
from litellm import completion
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

def test_groq_models():
    groq_key = os.getenv("GROQ_API_KEY")
    
    models = [
        "groq/llama3-70b-8192",
        "groq/mixtral-8x7b-32768",
        "groq/llama-3.1-8b-instant"
    ]
    
    for m in models:
        try:
            response = completion(
                model=m,
                messages=[{"role": "user", "content": "List 3 colors as a JSON array of strings. Format: {'colors': ['red', 'blue', 'green']}"}],
                api_key=groq_key,
                response_format={"type": "json_object"}
            )
            print(f"{m} SUCCESS: {response.choices[0].message.content.strip()}")
        except Exception as e:
            print(f"{m} FAILED: {e}")

if __name__ == "__main__":
    test_groq_models()
