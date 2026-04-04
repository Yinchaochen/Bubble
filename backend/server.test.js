// Tests for Method B (retry fallback articles) and Method C (filter before caching)
// These replicate the exact logic from server.js updateNews() to verify correctness.

// ──────────────────────────────────────────────
// Method B: retry matching logic
// ──────────────────────────────────────────────
describe('Method B — retry fallback article matching', () => {
  const rawArticles = [
    { title: 'Art 1', originalUrl: 'https://example.com/1', content: 'Content 1.' },
    { title: 'Art 2', originalUrl: 'https://example.com/2', content: 'Content 2.' },
    { title: 'Art 3', originalUrl: 'https://example.com/3', content: 'Content 3.' },
  ];

  test('identifies only fallback articles for retry', () => {
    const summarized = [
      { translationMethod: 'Groq',           originalUrl: 'https://example.com/1', title: '翻译1' },
      { translationMethod: 'fallback',        originalUrl: 'https://example.com/2', title: 'Art 2' },
      { translationMethod: 'GoogleTranslate', originalUrl: 'https://example.com/3', title: '翻译3' },
    ];

    const fallbackArticles = summarized.filter(a => a.translationMethod === 'fallback');
    const failedRaw = rawArticles.filter(raw =>
      fallbackArticles.some(f => f.originalUrl === raw.originalUrl)
    );

    expect(fallbackArticles).toHaveLength(1);
    expect(failedRaw).toHaveLength(1);
    expect(failedRaw[0].originalUrl).toBe('https://example.com/2');
  });

  test('replaces fallback entry in summarized when retry succeeds', () => {
    const summarized = [
      { translationMethod: 'Groq',    originalUrl: 'https://example.com/1', title: '翻译1' },
      { translationMethod: 'fallback', originalUrl: 'https://example.com/2', title: 'Art 2' },
    ];

    const retried = [
      { translationMethod: 'Groq', originalUrl: 'https://example.com/2', title: '重试成功' },
    ];

    for (const r of retried) {
      if (r.translationMethod !== 'fallback') {
        const idx = summarized.findIndex(a => a.originalUrl === r.originalUrl);
        if (idx !== -1) summarized[idx] = r;
      }
    }

    expect(summarized[1].title).toBe('重试成功');
    expect(summarized[1].translationMethod).toBe('Groq');
  });

  test('does NOT replace entry when retry also returns fallback', () => {
    const summarized = [
      { translationMethod: 'fallback', originalUrl: 'https://example.com/1', title: 'Original English' },
    ];

    const retried = [
      { translationMethod: 'fallback', originalUrl: 'https://example.com/1', title: 'Still English' },
    ];

    for (const r of retried) {
      if (r.translationMethod !== 'fallback') {
        const idx = summarized.findIndex(a => a.originalUrl === r.originalUrl);
        if (idx !== -1) summarized[idx] = r;
      }
    }

    expect(summarized[0].title).toBe('Original English'); // unchanged
  });

  test('skips retry entirely when no fallback articles exist', () => {
    const summarized = [
      { translationMethod: 'Groq',           originalUrl: 'https://example.com/1', title: '翻译1' },
      { translationMethod: 'GoogleTranslate', originalUrl: 'https://example.com/2', title: '翻译2' },
    ];

    const fallbackArticles = summarized.filter(a => a.translationMethod === 'fallback');
    expect(fallbackArticles).toHaveLength(0); // no retry needed
  });

  test('only replaces the matched article, leaves others unchanged', () => {
    const summarized = [
      { translationMethod: 'fallback', originalUrl: 'url1', title: 'English 1' },
      { translationMethod: 'fallback', originalUrl: 'url2', title: 'English 2' },
    ];

    // Only url1 succeeds on retry
    const retried = [
      { translationMethod: 'Groq', originalUrl: 'url1', title: '重试成功' },
      { translationMethod: 'fallback', originalUrl: 'url2', title: 'Still English 2' },
    ];

    for (const r of retried) {
      if (r.translationMethod !== 'fallback') {
        const idx = summarized.findIndex(a => a.originalUrl === r.originalUrl);
        if (idx !== -1) summarized[idx] = r;
      }
    }

    expect(summarized[0].title).toBe('重试成功');
    expect(summarized[1].title).toBe('English 2'); // unchanged
  });
});

// ──────────────────────────────────────────────
// Method C: filter fallback before caching
// ──────────────────────────────────────────────
describe('Method C — filter fallback articles before caching', () => {
  test('removes all fallback articles from cache', () => {
    const summarized = [
      { translationMethod: 'Groq',           title: '翻译1', originalUrl: 'url1' },
      { translationMethod: 'fallback',        title: 'English', originalUrl: 'url2' },
      { translationMethod: 'GoogleTranslate', title: '翻译3', originalUrl: 'url3' },
    ];

    const toCache = summarized.filter(a => a.translationMethod !== 'fallback');

    expect(toCache).toHaveLength(2);
    expect(toCache.every(a => a.translationMethod !== 'fallback')).toBe(true);
    expect(toCache.find(a => a.originalUrl === 'url2')).toBeUndefined();
  });

  test('skips cache update when translated count is below 50% threshold', () => {
    const rawArticles = new Array(6).fill(null);
    const toCache = [
      { translationMethod: 'Groq' },
      { translationMethod: 'GoogleTranslate' },
    ]; // 2 out of 6 → below threshold

    const threshold = Math.ceil(rawArticles.length * 0.5); // 3
    expect(toCache.length < threshold).toBe(true);
  });

  test('allows cache update when translated count exactly meets 50% threshold', () => {
    const rawArticles = new Array(6).fill(null);
    const toCache = [
      { translationMethod: 'Groq' },
      { translationMethod: 'Groq' },
      { translationMethod: 'GoogleTranslate' },
    ]; // 3 out of 6 = exactly 50%

    const threshold = Math.ceil(rawArticles.length * 0.5); // 3
    expect(toCache.length < threshold).toBe(false);
  });

  test('allows cache update when all articles translated', () => {
    const rawArticles = new Array(6).fill(null);
    const toCache = new Array(6).fill({ translationMethod: 'Groq' });

    const threshold = Math.ceil(rawArticles.length * 0.5);
    expect(toCache.length < threshold).toBe(false);
  });

  test('English articles bypass fallback filter entirely', () => {
    const summarized = [
      { translationMethod: 'Groq', title: 'Summary 1' },
      { translationMethod: 'raw',  title: 'Raw content 2' },
    ];

    const lang = 'en';
    const toCache = lang === 'en'
      ? summarized
      : summarized.filter(a => a.translationMethod !== 'fallback');

    // 'raw' method is kept for English — no filtering applied
    expect(toCache).toHaveLength(2);
    expect(toCache[1].translationMethod).toBe('raw');
  });

  test('combined B+C: retry succeeds for one, C filters remaining fallback', () => {
    const summarized = [
      { translationMethod: 'Groq',    originalUrl: 'url1', title: '翻译1' },
      { translationMethod: 'fallback', originalUrl: 'url2', title: 'English 2' },
      { translationMethod: 'fallback', originalUrl: 'url3', title: 'English 3' },
    ];

    // Method B: retry — url2 succeeds, url3 still fails
    const retried = [
      { translationMethod: 'Groq',    originalUrl: 'url2', title: '重试成功' },
      { translationMethod: 'fallback', originalUrl: 'url3', title: 'English 3' },
    ];

    for (const r of retried) {
      if (r.translationMethod !== 'fallback') {
        const idx = summarized.findIndex(a => a.originalUrl === r.originalUrl);
        if (idx !== -1) summarized[idx] = r;
      }
    }

    // Method C: filter remaining fallbacks
    const toCache = summarized.filter(a => a.translationMethod !== 'fallback');

    expect(toCache).toHaveLength(2);
    expect(toCache.find(a => a.originalUrl === 'url3')).toBeUndefined(); // filtered out
    expect(toCache.find(a => a.originalUrl === 'url2').title).toBe('重试成功'); // retry result kept
  });
});
