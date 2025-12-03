import google.generativeai as genai
import os
from dotenv import load_dotenv


load_dotenv()


api_key = "AIzaSyAhMTh-evQswrOPpyD03LjBqvr8_pLeQmY"
genai.configure(api_key=api_key)

print("Available Models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"- {m.name}")