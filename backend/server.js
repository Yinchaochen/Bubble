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

console.log('🔑 GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Loaded' : '❌ MISSING — translations will fall back to English');

let cachedNews = {};
let lastUpdated = null;

async function updateNews() {
  try {
    const rawArticles = await fetchNews();
    const langList = ['en', 'de', 'zh'];

    // Process languages sequentially to avoid exceeding Groq's TPM limit.
    // Parallel processing multiplies token usage by the number of languages,
    // pushing well past the 6,000 TPM free-tier cap.
    for (const lang of langList) {
      try {
        const summarized = await summarize(rawArticles, lang);

        // Method B: retry fallback articles once after a delay
        if (lang !== 'en') {
          const fallbackArticles = summarized.filter(a => a.translationMethod === 'fallback');
          if (fallbackArticles.length > 0) {
            console.log(`♻️  [${lang}] ${fallbackArticles.length} fallback article(s) — retrying in 30s...`);
            await new Promise(r => setTimeout(r, 30000));
            const failedRaw = rawArticles.filter(raw =>
              fallbackArticles.some(f => f.originalUrl === raw.originalUrl)
            );
            const retried = await summarize(failedRaw, lang);
            for (const r of retried) {
              if (r.translationMethod !== 'fallback') {
                const idx = summarized.findIndex(a => a.originalUrl === r.originalUrl);
                if (idx !== -1) summarized[idx] = r;
              }
            }
          }
        }

        // Method C: filter out any remaining untranslated articles before caching
        const toCache = lang === 'en'
          ? summarized
          : summarized.filter(a => a.translationMethod !== 'fallback');

        if (lang !== 'en' && toCache.length < Math.ceil(rawArticles.length * 0.5)) {
          console.warn(`⚠️  [${lang}] Only ${toCache.length}/${rawArticles.length} translated — skipping cache update`);
          continue;
        }

        cachedNews[lang] = toCache;
        console.log(`✅ [${lang}] cache updated (${toCache.length} articles)`);
      } catch (err) {
        console.error(`summarize error [${lang}]:`, err.message);
        if (lang === 'en') {
          cachedNews[lang] = rawArticles.map(article => ({
            ...article,
            summary: article.content?.slice(0, 150) || 'No summary available.',
          }));
        }
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
  setInterval(updateNews, 1000 * 60 * 60); // 60 min — ~300K tokens/day, safely under Groq 500K TPD free limit
});