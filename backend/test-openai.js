require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
});

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say hello in French' }
      ],
    });
    console.log('✅ 成功返回：', response.choices[0].message.content);
  } catch (err) {
    console.error('❌ 报错信息：', err.response?.data || err.message || err);
  }
}

test();
