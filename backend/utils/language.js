function getPromptForLanguage(article, lang) {
  const langMap = {
    en: 'English',
    zh: 'Chinese',
    de: 'German'
  };

  return `
Title: ${article.title}
Content: ${article.content}

Please summarize this news article in ${langMap[lang]} in 2-3 sentences.
`;
}

module.exports = { getPromptForLanguage };