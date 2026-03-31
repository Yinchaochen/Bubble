const axios = require('axios');
const xml2js = require('xml2js');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
};

async function fetchFromRSS(url, sourceName, count = 2) {
  const response = await axios.get(url, { timeout: 10000, headers: HEADERS });
  const xml = response.data;

  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xml);

  // Support both RSS 2.0 and RDF/RSS 1.0
  let items;
  if (result.rss && result.rss.channel) {
    items = result.rss.channel.item;
  } else if (result['rdf:RDF']) {
    items = result['rdf:RDF']['item'];
  } else {
    throw new Error(`Unknown RSS format from ${sourceName}`);
  }

  if (!Array.isArray(items)) items = [items];

  return items.slice(0, count).map((item) => ({
    title: typeof item.title === 'object' ? item.title._ : item.title,
    content: typeof item.description === 'object' ? item.description._ : (item.description || ''),
    source: sourceName,
    originalUrl: typeof item.link === 'object' ? item.link._ : item.link,
    publishedAt: item.pubDate || item['dc:date'] || new Date().toISOString(),
  }));
}

const SOURCES = [
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    name: 'BBC News',
    count: 2,
  },
  {
    url: 'https://www.spiegel.de/international/index.rss',
    name: 'Der Spiegel',
    count: 2,
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    name: 'The New York Times',
    count: 2,
  },
];

async function fetchNews() {
  const results = await Promise.allSettled(
    SOURCES.map(({ url, name, count }) => fetchFromRSS(url, name, count))
  );

  const articles = [];

  for (let i = 0; i < results.length; i++) {
    const { status, value, reason } = results[i];
    const source = SOURCES[i];

    if (status === 'fulfilled') {
      articles.push(...value);
    } else {
      console.error(`Failed to fetch ${source.name}: ${reason.message}`);
      articles.push({
        title: `${source.name} Feed Unavailable`,
        content: `Failed to fetch ${source.name} RSS feed.`,
        source: source.name,
        originalUrl: source.url,
        publishedAt: new Date().toISOString(),
      });
    }
  }

  return articles;
}

module.exports = fetchNews;
