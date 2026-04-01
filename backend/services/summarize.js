const axios = require('axios');
const translate = require('google-translate-api-x');
require('dotenv').config();

const MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const LANG_MAP = { en: 'en', de: 'de', zh: 'zh-CN' };

async function translateText(text, targetLang) {
  const truncated = text.length > 480 ? text.slice(0, 480) + '…' : text;
  const result = await translate(truncated, { from: 'en', to: targetLang });
  return result.text;
}

async function callGroq(messages, maxTokens = 250) {
  const response = await axios.post(
    GROQ_URL,
    { model: MODEL, messages, max_tokens: maxTokens, temperature: 0.7 },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return response.data.choices[0].message.content.trim();
}

module.exports = async function summarize(articles, lang) {
  const targetLang = LANG_MAP[lang] || lang;
  const langName = lang === 'zh' ? 'Chinese' : lang === 'de' ? 'German' : 'English';
  const results = [];

  for (const article of articles) {
    const rawContent = (article.content || article.description || '').slice(0, 800);
    let summary = rawContent || 'No content available.';
    let translatedTitle = article.title;
    let translationMethod = 'fallback';

    // ── Attempt 1: Groq — ONE call per article (summary + title together) ──
    try {
      console.log(`🤖 Groq [${lang}]: ${article.title.slice(0, 50)}…`);

      if (lang === 'en') {
        // English: summarise only — no translation needed
        summary = await callGroq([
          { role: 'system', content: 'You are a concise news summariser. Respond only in English.' },
          { role: 'user', content: `Summarise in 2–3 sentences:\n\nTitle: ${article.title}\n\n${rawContent}` },
        ]);
      } else {
        // Non-English: ONE call that returns both translated title and summary.
        // Using a plain-text format to avoid JSON parsing issues.
        const raw = await callGroq([
          {
            role: 'system',
            content: `You are a news summariser and translator. Always respond in ${langName} only. Never switch to English.`,
          },
          {
            role: 'user',
            content: `Translate the headline and summarise the article in ${langName}.\n\nRespond in EXACTLY this format (two lines, nothing else):\nTITLE: <translated headline>\nSUMMARY: <2–3 sentence summary>\n\nHeadline: ${article.title}\nContent: ${rawContent}`,
          },
        ]);

        const titleMatch = raw.match(/^TITLE:\s*(.+)$/m);
        const summaryMatch = raw.match(/^SUMMARY:\s*([\s\S]+)$/m);
        translatedTitle = titleMatch ? titleMatch[1].trim() : article.title;
        summary = summaryMatch ? summaryMatch[1].trim() : raw;
      }

      translationMethod = 'Groq';
      console.log(`✅ Groq [${lang}] done`);

    // ── Attempt 2: Google Translate fallback (non-English only) ─────────
    } catch (groqErr) {
      console.warn(`⚠️  Groq [${lang}] failed: ${groqErr.message}`);

      if (lang === 'en') {
        // English: just use raw content — no translation needed, no extra wait
        translationMethod = 'raw';
        console.log(`📄 English raw fallback used`);
      } else {
        try {
          translatedTitle = await translateText(article.title, targetLang);
          summary        = await translateText(rawContent,     targetLang);
          translationMethod = 'GoogleTranslate';
          console.log(`✅ GoogleTranslate [${lang}] done`);
        // ── Attempt 3: keep original English ──────────────────────────
        } catch (transErr) {
          console.error(`❌ All translation failed [${lang}]: ${transErr.message}`);
          // translatedTitle and summary keep their initial English values
        }
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

    console.log(`📰 [${lang}] ${translatedTitle.slice(0, 60)}`);
    // Only throttle when Groq actually succeeded — GoogleTranslate/raw need no delay.
    if (translationMethod === 'Groq') {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`🎉 [${lang}] ${results.length} articles processed`);
  return results;
};
