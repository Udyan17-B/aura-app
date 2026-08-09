const cache = {};

export default async function handler(req, res) {
  const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
          }

            if (cache[q]) {
                return res.status(200).json(cache[q]);
                  }

                    try {
                        const url = new URL("https://www.googleapis.com/youtube/v3/search");
                            url.searchParams.set("part", "snippet");
                                url.searchParams.set("q", q);
                                    url.searchParams.set("type", "video");
                                        url.searchParams.set("maxResults", "3");
                                            url.searchParams.set("relevanceLanguage", "en");
                                                url.searchParams.set("videoEmbeddable", "true");
                                                    url.searchParams.set("key", process.env.YOUTUBE_KEY);

                                                        const response = await fetch(url.toString());
                                                            const data = await response.json();

                                                                const items = data.items || [];
                                                                    const item = items.find(it => it.id && it.id.videoId) || items[0];

                                                                        if (!item || !item.id || !item.id.videoId) {
                                                                              return res.status(404).json({ error: "No video found" });
                                                                                  }

                                                                                      const result = {
                                                                                            title: item.snippet.title,
                                                                                                  channel: item.snippet.channelTitle,
                                                                                                        thumbnail: item.snippet.thumbnails?.medium?.url || null,
                                                                                                              url: `https://www.youtube.com/watch?v=${item.id.videoId}`
                                                                                                                  };

                                                                                                                      cache[q] = result;
                                                                                                                          return res.status(200).json(result);

                                                                                                                            } catch (err) {
                                                                                                                                return res.status(500).json({ error: err.message });
                                                                                                                                  }
                                                                                                                                  }