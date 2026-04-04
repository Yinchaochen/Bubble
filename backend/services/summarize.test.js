jest.mock('axios');
jest.mock('google-translate-api-x');

const axios = require('axios');
const translate = require('google-translate-api-x');

process.env.GROQ_API_KEY = 'test-key';

const summarize = require('./summarize');

// Make all setTimeout calls execute immediately to avoid slow tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(global, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const mockArticles = [
  {
    title: 'Ukraine troops quit fighting: eastern front unusually quiet',
    content: 'Soldiers on the eastern front have reportedly abandoned their positions.',
    source: 'BBC News',
    originalUrl: 'https://example.com/article1',
    publishedAt: '2024-01-01T00:00:00Z',
  },
];

function groqReply(text) {
  return {
    data: { choices: [{ message: { content: text } }] },
  };
}

// ──────────────────────────────────────────────
// Method A: callGroqWithRetry (exponential backoff)
// ──────────────────────────────────────────────
describe('Method A — Groq retry with exponential backoff', () => {
  test('succeeds on first attempt, no retries needed', async () => {
    axios.post.mockResolvedValueOnce(
      groqReply('TITLE: 乌克兰士兵撤退\nSUMMARY: 东部战线沉寂，士兵放弃阵地。')
    );

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].translationMethod).toBe('Groq');
    expect(results[0].title).toBe('乌克兰士兵撤退');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('retries once after first failure, succeeds on second attempt', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('rate limit exceeded'))
      .mockResolvedValueOnce(
        groqReply('TITLE: 乌克兰士兵撤退\nSUMMARY: 东部战线沉寂。')
      );

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].translationMethod).toBe('Groq');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('retries twice after two failures, succeeds on third attempt', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(
        groqReply('TITLE: 乌克兰士兵撤退\nSUMMARY: 东部战线沉寂。')
      );

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].translationMethod).toBe('Groq');
    expect(axios.post).toHaveBeenCalledTimes(3);
  });

  test('falls back to GoogleTranslate after exhausting all 3 Groq attempts', async () => {
    axios.post.mockRejectedValue(new Error('Groq unavailable'));
    translate.mockResolvedValue({ text: '谷歌翻译结果' });

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].translationMethod).toBe('GoogleTranslate');
    // 1 initial + 2 retries = 3 Groq calls total
    expect(axios.post).toHaveBeenCalledTimes(3);
    expect(translate).toHaveBeenCalled();
  });

  test('falls back to original English when both Groq and GoogleTranslate fail', async () => {
    axios.post.mockRejectedValue(new Error('Groq down'));
    translate.mockRejectedValue(new Error('Google down'));

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].translationMethod).toBe('fallback');
    expect(results[0].title).toBe(mockArticles[0].title); // original English title preserved
  });

  test('English articles use raw content without translation on Groq failure', async () => {
    axios.post.mockRejectedValue(new Error('Groq down'));

    const results = await summarize(mockArticles, 'en');

    expect(results[0].translationMethod).toBe('raw');
    expect(translate).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────
// Fallback chain: parsed output validation
// ──────────────────────────────────────────────
describe('Groq response parsing', () => {
  test('correctly parses TITLE and SUMMARY from Groq response', async () => {
    axios.post.mockResolvedValueOnce(
      groqReply('TITLE: 解析标题\nSUMMARY: 这是摘要内容，两到三句话。')
    );

    const results = await summarize(mockArticles, 'zh');

    expect(results[0].title).toBe('解析标题');
    expect(results[0].summary).toBe('这是摘要内容，两到三句话。');
  });

  test('falls back to full Groq response as summary when format is unexpected', async () => {
    axios.post.mockResolvedValueOnce(
      groqReply('This response does not follow the expected format at all.')
    );

    const results = await summarize(mockArticles, 'zh');

    // title falls back to original, summary is the raw response
    expect(results[0].title).toBe(mockArticles[0].title);
    expect(results[0].summary).toContain('does not follow');
  });

  test('each result includes required fields', async () => {
    axios.post.mockResolvedValueOnce(
      groqReply('TITLE: 标题\nSUMMARY: 摘要。')
    );

    const results = await summarize(mockArticles, 'zh');
    const article = results[0];

    expect(article).toHaveProperty('id');
    expect(article).toHaveProperty('title');
    expect(article).toHaveProperty('summary');
    expect(article).toHaveProperty('source');
    expect(article).toHaveProperty('originalUrl');
    expect(article).toHaveProperty('timestamp');
    expect(article).toHaveProperty('translationMethod');
  });
});

// ──────────────────────────────────────────────
// Multiple articles
// ──────────────────────────────────────────────
describe('Multiple articles processing', () => {
  const twoArticles = [
    {
      title: 'Article One',
      content: 'Content one.',
      source: 'BBC',
      originalUrl: 'https://example.com/1',
      publishedAt: '2024-01-01T00:00:00Z',
    },
    {
      title: 'Article Two',
      content: 'Content two.',
      source: 'NYT',
      originalUrl: 'https://example.com/2',
      publishedAt: '2024-01-01T00:00:00Z',
    },
  ];

  test('processes all articles and returns one result per input', async () => {
    axios.post
      .mockResolvedValueOnce(groqReply('TITLE: 标题一\nSUMMARY: 摘要一。'))
      .mockResolvedValueOnce(groqReply('TITLE: 标题二\nSUMMARY: 摘要二。'));

    const results = await summarize(twoArticles, 'zh');

    expect(results).toHaveLength(2);
    expect(results[0].translationMethod).toBe('Groq');
    expect(results[1].translationMethod).toBe('Groq');
  });

  test('continues processing remaining articles even if one fails completely', async () => {
    axios.post.mockRejectedValue(new Error('Groq down'));
    translate
      .mockRejectedValueOnce(new Error('Google down')) // article 1 title → fails → fallback
      .mockResolvedValue({ text: '谷歌翻译' });         // article 2 title + content → success

    const results = await summarize(twoArticles, 'zh');

    expect(results).toHaveLength(2);
    expect(results[0].translationMethod).toBe('fallback');
    expect(results[1].translationMethod).toBe('GoogleTranslate');
  });
});
