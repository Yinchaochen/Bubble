const axios = require('axios');
const xml2js = require('xml2js');

async function fetchNews() {
  const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';

  try {
    const response = await axios.get(rssUrl);
    const xml = response.data;

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);

    const items = result.rss.channel.item;

    const articles = items.slice(0, 5).map((item) => ({
      title: item.title,
      content: item.description,
      source: 'BBC News',
      originalUrl: item.link,
      publishedAt: item.pubDate,
    }));

    return articles;
  } catch (err) {
    console.error('Failed to fetch BBC RSS feed:', err.message);
    return [
      {
        title: 'Mock: BBC Feed Unavailable',
        content: 'Failed to fetch BBC RSS feed.',
        source: 'BBC News',
        originalUrl: 'https://bbc.com/news',
        publishedAt: new Date().toISOString(),
      },
    ];
  }
}

module.exports = fetchNews;