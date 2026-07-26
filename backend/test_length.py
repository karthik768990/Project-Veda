import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
try:
    from google.genai import types
    r = client.models.generate_content(
        model='gemini-3.5-flash',
        contents="Please write a very long story with exactly 500 words. Keep writing until you hit exactly 500 words.",
        config=types.GenerateContentConfig(
            max_output_tokens=2048
        )
    )
    print(f"Tokens output: {len(r.text.split())}")
    print(f"End of text: {r.text[-100:]}")
except Exception as e:
    print(f"FAILED: {e}")
