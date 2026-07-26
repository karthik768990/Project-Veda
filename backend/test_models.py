import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-pro-exp']
for m in models:
    try:
        r = client.models.generate_content(model=m, contents="hello")
        print(f"{m} SUCCESS: {r.text[:20]}")
    except Exception as e:
        print(f"{m} FAILED: {str(e)[:100]}")
