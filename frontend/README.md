# News AI App  
### Multi-Language News Summarization Platform  
*(English | Deutsch | 中文)*

---

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
│ │ ├── summarize.js # Generate summaries and translations via OpenAI (with fallback)
│ │ └── cache.js (optional) # Cache management logic (if used)
│ ├── package.json # Backend dependencies and scripts
│ └── .env.example # Example environment variables file
│
└── README.md # Project documentation (this file)

## Tech Stack / 技术栈 / Technologiestack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React 19 · TypeScript · MUI v7 · Axios · Lucide Icons |
| **Backend** | Node.js 18+ · Express · OpenAI API v5 · Google-Translate-API-X · node-cron · xml2js |
| **Security** | Helmet · CORS · Express-Rate-Limit |
| **Deployment** | Vercel (Frontend) + Render / Railway / Heroku (Backend) |
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

# Terminal 1
```bash
cd backend
npm start
```

# Terminal 2
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

Description: Manually trigger cache refresh (admin use).

UI Framework / 前端设计说明 / UI-Framework

English:
MUI (Material-UI v7) is chosen for its stable component system, responsive layout, and full support for TypeScript and React 19.
lucide-react provides lightweight modern icons.

Deutsch:
Verwendet MUI für konsistente UI-Komponenten und lucide-react für Icons.

中文：
前端采用 MUI v7，其组件丰富、样式统一、响应式良好，适合快速开发。
lucide-react 用于简洁现代的图标系统。
起初我打算采用Tailwind CSS, 但是因为Tailwind CSS的一个兼容问题，导致我最终放弃了Tailwind CSS，转而使用MUI。