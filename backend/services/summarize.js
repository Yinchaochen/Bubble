const axios = require('axios');
require('dotenv').config();

const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Language code mapping for MyMemory API
const LANG_MAP = { en: 'en', de: 'de', zh: 'zh' };

// MyMemory free translation API — fallback only
// Free tier limit: 500 chars per request — truncate before sending.
async function translateText(text, targetLang) {
  const truncated = text.length > 480 ? text.slice(0, 480) + '…' : text;
  const response = await axios.get('https://api.mymemory.translated.net/get', {
    params: { q: truncated, langpair: `en|${targetLang}` },
    timeout: 8000,
  });
  if (response.data.responseStatus !== 200) {
    throw new Error(`MyMemory API error: ${response.data.responseStatus} — ${response.data.responseDetails}`);
  }
  return response.data.responseData.translatedText;
}

async function callGroq(messages, maxTokens = 200) {
  const response = await axios.post(
    GROQ_URL,
    { model: MODEL, messages, max_tokens: maxTokens, temperature: 0.7 },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return response.data.choices[0].message.content.trim();
}

module.exports = async function summarize(articles, lang) {
  const targetLang = LANG_MAP[lang] || lang;
  const langName = lang === 'zh' ? 'Chinese' : lang === 'de' ? 'German' : 'English';
  const results = [];

  for (const article of articles) {
    const rawContent = article.content || article.description || 'No content available.';
    let summary = rawContent;
    let translatedTitle = article.title;
    let translationMethod = 'fallback';

    // ── Attempt 1: Groq (Llama 3.3 70B) ─────────────────────────────
    try {
      console.log(`🤖 Groq: summarising in ${lang}…`);

      summary = await callGroq([
        { role: 'system', content: `You are a news summariser. Respond only in ${langName}.` },
        { role: 'user', content: `Summarise this news article in ${langName} in 2–3 sentences:\n\nTitle: ${article.title}\n\n${rawContent}` },
      ]);

      if (lang !== 'en') {
        translatedTitle = await callGroq([
          { role: 'user', content: `Translate this headline to ${langName}. Reply with the translation only:\n${article.title}` },
        ], 80);
      }

      translationMethod = 'Groq';
      console.log(`✅ Groq succeeded [${lang}]`);

    // ── Attempt 2: MyMemory translation ──────────────────────────────
    } catch (groqErr) {
      console.warn(`⚠️  Groq failed [${lang}]: ${groqErr.message}`);

      try {
        console.log(`🌐 Falling back to MyMemory [${targetLang}]…`);

        if (lang !== 'en') {
          translatedTitle = await translateText(article.title, targetLang);
          summary = await translateText(rawContent, targetLang);
        }

        translationMethod = 'MyMemory';
        console.log(`✅ MyMemory succeeded [${lang}]`);

      // ── Attempt 3: plain English fallback ────────────────────────
      } catch (memoryErr) {
        console.error(`❌ MyMemory also failed [${lang}]: ${memoryErr.message}`);
        translatedTitle = article.title;
        summary = rawContent;
        translationMethod = 'fallback';
      }
    }

    results.push({
      id: Date.now() + Math.random(),
      title: translatedTitle,
      summary,
      source: article.source,
      originalUrl: article.originalUrl,
      timestamp: article.publishedAt,
      translationMethod,
    });

    console.log(`📰 Done: ${translatedTitle.slice(0, 60)}…`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Groq is faster, 500ms is enough
  }

  console.log(`🎉 Processed ${results.length} articles [${lang}]`);
  return results;
};
