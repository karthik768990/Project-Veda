import google.generativeai as genai
import os

api_key = os.getenv("GEMINI_API_KEY") # Or paste your key string here for a quick test
genai.configure(api_key=api_key)

print("Available Models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"- {m.name}")