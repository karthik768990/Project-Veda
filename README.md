# 🌺 Project Veda — Sanskrit Chandas Identification & Analysis System
*A modern AI-powered system to decode the poetic heartbeat of Sanskrit literature.*

---

## 📖 Overview

**Project Veda** is a full-stack Sanskrit *prosody analysis engine* that automatically identifies the **Chandas (meter)** of any Sanskrit śloka.

It uses:

- Linguistic L/G (Laghu–Guru) syllable extraction  
- Fuzzy similarity matching  
- Supabase-based canonical Chandas storage  
- A modern React-based frontend  

This project blends **ancient Sanskrit poetics** with **modern computational linguistics**, creating a bridge between tradition and technology.

---

## ✨ Features

- 🔠 Supports Devanagari + IAST input  
- 🎼 Accurate Laghu/Guru syllable detection  
- 🧠 Fuzzy meter identification with confidence scoring  
- ☁️ Supabase database for Chandas patterns  
- 🌐 Full-stack architecture (Node + React + Vite + Tailwind)  
- 🔑 Supabase OAuth (Google Login)  
- 🚀 Deployable via Vercel (frontend) & Render (backend)  
- 🐳 Docker support for both services  

---

# 🧭 Project Structure

```bash

veda-chandas/
│
├── backend/
│ ├── controllers/
│ ├── middleware/
│ ├── routes/
│ ├── Dockerfile
│ └── server.js
│
├── frontend/
│ ├── src/
│ ├── Dockerfile
│ ├── vite.config.js
│ └── package.json
│
└── README.md






```




---

# ⚙️ Backend Setup

## 📌 Environment Variables
Create `.env` inside `/backend`:

```bash

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000

```




## 📦 Install Dependencies
```bash
cd veda-backend
pip install -r requirements.txt

```

## Run development server 
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 3000

```

## 🚀 Run Production Server
```bash
npm start

```

## 🧪 Test the API

```bash
curl -X POST http://localhost:3000/chandas/analyze \
  -H "Content-Type: application/json" \
  -d "{\"shloka\": \"गजाननं भूतगणादिसेवितं\"}"


```


##  🎨 Frontend setup

Create .env inside /frontend:

```bash
VITE_BASE_URL = your_backend_url
VITE_GOOGLE_CLIENT_ID = your_google_client_id_cloudconsole

```

## 📦 Install Dependencies

```bash
cd veda-frontend
npm install


```

## ▶️ Run Dev Server

```bash
npm run dev
```

## 🏗️ Build for Production
```bash
npm run build

```

## 🔄 Preview Production Build

```bash
npm run preview

```

## 🐳 Docker Setup

## Backend
```bash 
docker build -t chandas-backend .
docker run -p 3000:3000 chandas-backend
```
## Frontend
```bash 

docker build -t chandas-frontend .
docker run -p 5173:80 chandas-frontend

```

## 🌐 Deployment
Frontend → Vercel

Build command: npm run build

Output directory: dist/

Set environment variables in Vercel dashboard

Backend → Render

Select "Web Service"

Set environment variables

Start command: npm start

## 🧠 How the Engine Works
1️⃣ Input Validation

Ensures the śloka is clean: trims whitespace, removes HTML tags, checks length, etc.

2️⃣ LG Pattern Extraction

Uses classical Sanskrit prosody rules to compute Laghu (L) and Guru (G) syllables.

3️⃣ Fuzzy Pattern Matching

Fetches meters from Supabase

Repeats canonical pattern to approximate verse length

Computes similarity via Levenshtein distance

If similarity ≥ 70% → identifies meter

Special handling for Anuṣṭubh (8-syllable structure)

4️⃣ Output Data Includes:

Original + transliterated verse

LG pattern per pāda

Combined pattern

Identified Chandas

Explanation + confidence score

## 📚 Applications

Sanskrit learning platforms

Shloka recitation/chanting validation tools

Automated poetic meter classification

Digital humanities research

Mobile/web Sanskrit study apps


## 🤝 Contributing

Contributions are welcome!
You can help by improving accuracy, adding more meters, refining UI, or enhancing algorithms.

## ⭐ Support the Project

If this project helps you, please star ⭐ the repository — it motivates further development!


