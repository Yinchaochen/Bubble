require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetchNews = require('./services/fetchNews');
const summarize = require('./services/summarize');

const app = express();
const PORT = process.env.PORT || 5000;

// 读取允许的网址列表/ Read the list of allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000']; // 如果没设置就用默认值/ If not set, use default value

// 配置 CORS（跨域访问控制）/ Configure CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: function (origin, callback) {
    // 如果请求来源在允许列表中，就放行/  If the request origin is in the allowed list, allow it
    // 如果没有来源（如本地请求），也放行/ If there is no origin (like local requests), also allow it
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 否则拒绝访问/ Otherwise, deny access
      callback(new Error('deny access'));
    }
  }
}));
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
        cachedNews[lang] = summarized; // 
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
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🌍 Check your deployment platform for the actual URL`);
  
  updateNews();
  setInterval(updateNews, 1000 * 60 * 5);
});