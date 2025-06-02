const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 语言代码映射/ Language code mapping
const LANG_MAP = {
  'en': 'en',
  'de': 'de', 
  'zh': 'zh-CN'
};

// 修复 Google Translate 导入/ Fix Google Translate import issues
// 由于 Google Translate API 的导入方式可能会有不同，这里尝试几种方式// Since the import method for Google Translate API may vary, we try several methods
async function translateWithGoogle(text, targetLang) {
  try {
    // 方法1: 尝试默认导入/ Default import
    const translate = require('google-translate-api-x');
    const result = await translate(text, { to: targetLang });
    return result.text;
  } catch (error) {
    console.log('尝试其他导入方式...');
    try {
      // 方法2: 尝试解构导入/ Destructuring import
      const { translate } = require('@vitalets/google-translate-api');
      const result = await translate(text, { to: targetLang });
      return result.text;
    } catch (error2) {
      console.log('尝试动态导入...');
      try {
        // 方法3: 动态导入/ Dynamic import
        const translateModule = await import('@vitalets/google-translate-api');
        const translate = translateModule.default || translateModule;
        const result = await translate(text, { to: targetLang });
        return result.text;
      } catch (error3) {
        throw new Error(`所有Google Translate导入方式都失败了: ${error3.message}`);
      }
    }
  }
}

module.exports = async function summarize(articles, lang) {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in env');
    throw new Error('OpenAI key missing');
  }

  const results = [];
  const targetLang = LANG_MAP[lang] || lang;

  for (const article of articles) {
    const fallbackSummary = article.content || article.description || 'No content available.';
    let summary = fallbackSummary;
    let translatedTitle = article.title;
    let useOpenAI = true;

    // At first try to translate with OpenAI
    try {
      console.log(`🤖 trying to use OpenAI translate into ${lang} ...`);
      
      const prompt = `Please summarize this article in ${lang === 'zh' ? 'Chinese' : lang === 'de' ? 'German' : 'English'}:\n\nTitle: ${article.title}\n\n${fallbackSummary}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: `You are a helpful assistant that summarizes news articles in ${lang === 'zh' ? 'Chinese' : lang === 'de' ? 'German' : 'English'}.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      summary = response.data.choices[0].message.content.trim();
      
      // 对于非英语，也翻译标题/ For non-English languages, translate the title
      if (lang !== 'en') {
        const titlePrompt = `Please translate this title to ${lang === 'zh' ? 'Chinese' : lang === 'de' ? 'German' : 'English'}: ${article.title}`;
        const titleResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: titlePrompt }],
            temperature: 0.3,
            max_tokens: 100,
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000
          }
        );
        translatedTitle = titleResponse.data.choices[0].message.content.trim();
      }
      
      console.log(`✅ OpenAI successful translated [${lang}]`);
      
    } catch (openaiError) {
      console.error(`⚠️ OpenAI failed to translate [${lang}]:`, openaiError.response?.data || openaiError.message);
      useOpenAI = false;
      
      // 如果 OpenAI 失败，使用 Google Translate/ If OpenAI fails, use Google Translate as fallback
      try {
        console.log(`🌐 using Google Translate as alternaltive [${targetLang}]...`);
        
        if (lang !== 'en') {
          // 翻译标题/ Translate title if not English
          translatedTitle = await translateWithGoogle(article.title, targetLang);
          console.log(`Title translated: ${article.title} -> ${translatedTitle}`);

          // 翻译内容摘要/ Translate summary
          summary = await translateWithGoogle(fallbackSummary, targetLang);
          console.log(`Summary translated [${targetLang}]`);
        } else {
          translatedTitle = article.title;
          summary = fallbackSummary;
        }
        
        console.log(`✅ Google Translate successfully translated [${lang}]`);
        
      } catch (translateError) {
        console.error(`❌ Google Translate also failed to translate [${lang}]:`, translateError.message);
        
        // 最终备选方案：简单的文本标记/ Final fallback: simple text marking
        if (lang !== 'en') {
          translatedTitle = `[${lang.toUpperCase()}] ${article.title}`;
          summary = `[${lang.toUpperCase()} Open Ai Translation Unavailable] ${fallbackSummary.slice(0, 150)}...`;
        } else {
          translatedTitle = article.title;
          summary = fallbackSummary;
        }
      }
    }

    const result = {
      id: Date.now() + Math.random(),
      title: translatedTitle,
      summary: summary,
      source: article.source,
      originalUrl: article.originalUrl,
      timestamp: article.publishedAt,
      translationMethod: useOpenAI ? 'OpenAI' : 'GoogleTranslate'
    };
    
    results.push(result);
    console.log(`📰 处理完成: ${translatedTitle.slice(0, 50)}...`);

    await new Promise(resolve => setTimeout(resolve, 1000)); // 避免速率限制/ Avoid rate limiting, Better to set the value as 1000ms(800 is a bit risky)
  }

  console.log(`🎉 总共处理了 ${results.length} 篇文章 [${lang}]`);
  return results;
};