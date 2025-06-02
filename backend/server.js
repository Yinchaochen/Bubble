require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetchNews = require('./services/fetchNews');
const summarize = require('./services/summarize');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log('✅ ENV:', process.env.OPENAI_API_KEY ? '✅ API Key Loaded' : '❌ No API Key');

let cachedNews = {};
let lastUpdated = null;

async function updateNews() {
  try {
    const rawArticles = await fetchNews();
    const langList = ['en', 'de', 'zh'];

    for (const lang of langList) {
      try {
        const summarized = await summarize(rawArticles, lang);
        cachedNews[lang] = summarized; // ✅ 修复：使用正确的变量名
      } catch (err) {
        console.error(`OpenAI summarize error [${lang}]:`, err.message);
        cachedNews[lang] = rawArticles.map(article => ({
          ...article,
          summary: `This is a mock summary. ${article.content?.slice(0, 50)}...`
        }));
      }
    }

    lastUpdated = new Date().toISOString();
    console.log('News updated');
  } catch (err) {
    console.error('Error updating news:', err.message);
  }
}

app.get('/api/news', (req, res) => {
  const lang = req.query.lang || 'en';
  res.json({
    success: true,
    data: cachedNews[lang] || [],
    lastUpdated,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  updateNews();
  setInterval(updateNews, 1000 * 60 * 5); // 每 5 分钟刷新新闻
});