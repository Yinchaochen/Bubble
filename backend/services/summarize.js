const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'no-key',
  project: process.env.OPENAI_PROJECT_ID,
});

// Language code mapping for MyMemory API
const LANG_MAP = { en: 'en', de: 'de', zh: 'zh' };

// Uses MyMemory free translation API — works reliably from cloud servers
// unlike google-translate-api-x which gets blocked by Google on cloud IPs.
// MyMemory free tier limit: 500 chars per request — truncate before sending.
async function translateText(text, targetLang) {
  const axios = require('axios');
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

async function callOpenAI(messages, maxTokens = 200) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return response.choices[0].message.content.trim();
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

    // ── Attempt 1: OpenAI ─────────────────────────────────────────
    try {
      console.log(`🤖 OpenAI: summarising in ${lang}…`);

      summary = await callOpenAI([
        { role: 'system', content: `You are a news summariser. Respond only in ${langName}.` },
        { role: 'user', content: `Summarise this news article in ${langName} in 2–3 sentences:\n\nTitle: ${article.title}\n\n${rawContent}` },
      ]);

      if (lang !== 'en') {
        translatedTitle = await callOpenAI([
          { role: 'user', content: `Translate this headline to ${langName}. Reply with the translation only:\n${article.title}` },
        ], 80);
      }

      translationMethod = 'OpenAI';
      console.log(`✅ OpenAI succeeded [${lang}]`);

    // ── Attempt 2: Google Translate ───────────────────────────────
    } catch (openaiErr) {
      console.warn(`⚠️  OpenAI failed [${lang}]: ${openaiErr.message}`);

      try {
        console.log(`🌐 Falling back to Google Translate [${targetLang}]…`);

        if (lang !== 'en') {
          translatedTitle = await translateText(article.title, targetLang);
          summary = await translateText(rawContent, targetLang);
        }

        translationMethod = 'GoogleTranslate';
        console.log(`✅ Google Translate succeeded [${lang}]`);

      // ── Attempt 3: plain English fallback ────────────────────────
      } catch (googleErr) {
        console.error(`❌ Google Translate also failed [${lang}]: ${googleErr.message}`);
        // Return original English content with a note
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`🎉 Processed ${results.length} articles [${lang}]`);
  return results;
};
