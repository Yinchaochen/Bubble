# News AI App  
### Multi-Language News Summarization Platform  
*(English | Deutsch | 中文)*

---
##  Demo

[ Website: Bubble](https://bubble-psi-three.vercel.app)



## Overview / 项目简介 / Projektübersicht

**English:**  
News-AI is a multilingual news summarization web app that fetches global headlines (currently from BBC), generates concise summaries using OpenAI, and provides real-time translations in English, German, and Chinese.  

**Deutsch:**  
News-AI ist eine mehrsprachige Nachrichten-App, die BBC-Artikel abruft, mit OpenAI automatisch zusammenfasst und die Ergebnisse auf Englisch, Deutsch und Chinesisch präsentiert.  

**中文：**  
News-AI 是一个多语言新闻摘要平台，自动抓取 BBC 新闻，调用 OpenAI 模型生成简短摘要，并提供英文、德文、中文三语展示。  
支持定时更新与缓存机制，前端界面简洁、移动端自适应。

---

## Project Structure / 项目结构 / Projektstruktur
news-ai-app/
│
├── frontend/ # React + TypeScript + MUI
│ ├── src/
│ │ ├── App.tsx # Main UI component: language switch, news cards, loading state
│ │ ├── index.tsx # React entry point + global MUI theme setup
│ │ ├── components/ # Reusable UI components (e.g., Card, Menu, Buttons)
│ │ └── types/ # TypeScript interfaces and type definitions
│ └── package.json # Frontend dependencies and scripts
│
├── backend/ # Node.js + Express + OpenAI + Cron jobs
│ ├── server.js # Main Express server: routes, CORS, security, cache
│ ├── services/
│ │ ├── fetchNews.js # Fetch and parse BBC RSS feeds using axios + xml2js
│ │ └── summarize.js # Generate summaries and translations via OpenAI (with fallback)
│ ├── package.json # Backend dependencies and scripts
│ └── .env.example # Example environment variables file
│
└── README.md # Project documentation (this file)

## Tech Stack / 技术栈 / Technologiestack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React 19 · TypeScript · MUI v7 · Axios · Lucide Icons |
| **Backend** | Node.js · Express · OpenAI API v5 · Google-Translate-API-X · node-cron · xml2js |
| **Security** | Helmet · CORS · Express-Rate-Limit |
| **Deployment** | Vercel (Frontend) + Render (Backend) |
| **Cache & Jobs** | In-memory cache + Cron job every 2 hours |

## Quick Start / 快速启动 / Schnellstart

### 1, Clone the repository  
```bash
git clone https://github.com/Yinchaochen/Bubble.git
cd Bubble
```
### 2, Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3, Configure enviroment variables
Create a file .env in /backend with:
```bash
OPENAI_API_KEY=your_openai_key_here
ALLOWED_ORIGINS=http://localhost:3000
PORT=5000

(Optional for frontend)
REACT_APP_API_URL=http://localhost:5000
```

### 4, Run backend & frontend

#### Terminal 1
```bash
cd backend
npm start
```

#### Terminal 2
```bash
cd frontend
npm start
```

Frontend: http://localhost:3000
Backend: http://localhost:5000/api/news



## API Documentation / 接口说明 / API-Dokumentation
GET /api/news

Description: Returns cached summarized news in the requested language.
Params:

lang: en | de | zh


Response Example:
```bash
{
  "language": "en",
  "articles": [
    {
      "title": "Global economy slows down",
      "summary": "According to BBC...",
      "link": "https://www.bbc.com/...",
      "pubDate": "2025-10-15T08:00:00Z"
    }
  ],
  "lastUpdated": "2025-10-15T10:00:00Z"
}
GET /api/refresh
```

Description: Manually trigger cache refresh (admin use).

## UI Framework / 前端设计说明 / UI-Framework

English:
The frontend uses MUI v7, with lucide-react providing a clean and modern icon system.
Initially, I planned to use Tailwind CSS, but due to a compatibility issue with Tailwind CSS, I eventually decided to abandon it and switch to MUI instead.
I believe that using MUI is a safer choice for me as a beginner.

Deutsch:
Das Frontend verwendet MUI v7, und lucide-react sorgt für ein schlichtes und modernes Iconsystem.
Ursprünglich hatte ich vor, Tailwind CSS zu verwenden, aber aufgrund eines Kompatibilitätsproblems mit Tailwind CSS habe ich mich schließlich entschieden, darauf zu verzichten und stattdessen MUI zu verwenden.
Ich denke, dass die Verwendung von MUI für mich als Anfänger die sicherere Wahl ist.

中文：
前端采用 MUI v7，
lucide-react 用于简洁现代的图标系统。
起初我打算采用Tailwind CSS, 但是因为Tailwind CSS的一个兼容问题，导致我最终放弃了Tailwind CSS，转而使用MUI。我认为用MUI对于我这个初学者来说是一个更保险的选择。

## Backend Logic / 后端逻辑 / Backend-Logik

中文：

fetchNews.js 通过 axios 抓取 BBC RSS → xml2js 解析 → 提取标题、描述、时间等。
summarize.js 使用 OpenAI 对新闻生成摘要，失败时使用 Google 翻译备用方案。
定时任务 (node-cron) 每 2 小时更新缓存。
server.js 使用 helmet、cors、rate-limit 保障安全。

Deutsch:
fetchNews.js ruft die BBC-RSS-Feeds mit axios ab, analysiert sie mit xml2js und extrahiert Titel, Beschreibungen und Zeitstempel.
summarize.js verwendet OpenAI, um Nachrichten zusammenzufassen, und nutzt Google Translate als Ausweichlösung, falls die Zusammenfassung fehlschlägt.
Eine geplante Aufgabe mit node-cron aktualisiert alle zwei Stunden den Cache.
server.js sorgt mit helmet, cors und rate-limit für Sicherheit.

English:
fetchNews.js fetches BBC RSS feeds via axios, parses them using xml2js, and extracts titles, descriptions, and timestamps.
summarize.js uses OpenAI to generate news summaries, with Google Translate as a fallback when the summarization fails.
A scheduled task using node-cron updates the cache every two hours.
server.js ensures security with helmet, cors, and rate-limit.

## Environment Variables / 环境变量 / Umgebungsvariablen
Variable	              Description
OPENAI_API_KEY	        Your OpenAI API key
ALLOWED_ORIGINS	        Frontend domains allowed for CORS
PORT	                  Backend server port
REACT_APP_API_URL	      API endpoint for the frontend

## Scheduled Updates / 定时更新机制 / Zeitgesteuerte Aktualisierung
中文：
每 2 小时，后端会自动抓取最新新闻，并生成多语言摘要。
缓存的结果实时提供给前端，保持响应时间低。

English:
Every 2 hours the backend fetches the latest news and regenerates multilingual summaries.
Cached results are served instantly to the frontend, keeping response times low.

## Future Improvements / 后续优化 / Zukünftige Verbesserungen
Add support for multiple sources(Reuters, AP, CNN).
Store cache in Redis or SQlite for persistence.
Add search and filter UI.
cache.js

## Author / 作者 
Name: Yinchao Chen
Location: Berlin, Germany
Focus: Full-stack & AI Development
GitHub: https://github.com/Yinchaochen

This project was co-developed with AI

Email: lisumchen@gmail.com