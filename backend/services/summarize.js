const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
});

// Language code mapping for Google Translate
const LANG_MAP = { en: 'en', de: 'de', zh: 'zh-CN' };

async function translateWithGoogle(text, targetLang) {
  const translate = require('google-translate-api-x');
  const result = await translate(text, { to: targetLang });
  return result.text;
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in environment');
  }

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
          translatedTitle = await translateWithGoogle(article.title, targetLang);
          summary = await translateWithGoogle(rawContent, targetLang);
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
