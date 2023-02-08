const axios = require('axios');

const config = {
  miniflux: {
    baseUrl: process.env.MINIFLUX_BASE_URL,
    token: process.env.MINIFLUX_TOKEN,
  },
  reader: {
    baseUrl: 'https://readwise.io/api/v3',
    token: process.env.READER_TOKEN,
  },
};

const miniflux = axios.create({
  baseURL: config.miniflux.baseUrl,
  headers: {
    'x-Auth-Token': config.miniflux.token,
  },
});

const reader = axios.create({
  baseURL: config.reader.baseUrl,
  headers: {
    Authorization: `Token ${config.reader.token}`,
  },
});

const articles = {
  save: async (url, html, title, author, published_date, saved_using, should_clean_html=true) => reader.post('/save', { url, html, title, author, published_date, saved_using, should_clean_html }),
  toggleStar: async (entryId) => miniflux.put(`/entries/${entryId}/bookmark`),
  getStarred: async () => miniflux.get('/entries', {
    params: { starred: true },
  }),
};

module.exports = async function(params, context) {
  console.log('Checking for starred articles...');

  const { data } = await articles.getStarred();
  const { entries: starred } = data;
  
  console.log(`Found ${starred.length} starred articles to process...`);

  await Promise.all(starred.map(async (article) => {
    try {
      const saved_using = "miniflux";
      const { id: entryId, url, title, published_at: published_date, content: html, feed } = article;
      const author = feed.title;
      await articles.save(url, html, title, author, published_date, saved_using);
      await articles.toggleStar(entryId);
    } catch (error) {
      console.error(error);
      console.error('Failed to process article, continuing...');
    }
  }));
  
  return {
    message: 'Done!',
  };
}
