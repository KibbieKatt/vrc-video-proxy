const express = require('express');
const path = require('path');
require('dotenv').config();
const fetch = require('node-fetch');
const { fetchWithCustomReferer } = require('./fetchWithCustomReferer');
const { rewritePlaylistUrls } = require('./rewritePlaylistUrls');
const NodeCache = require('node-cache');
const morgan = require('morgan');
const helmet = require('helmet');
const { cleanEnv, str, num } = require('envalid');
const youtubedl = require('youtube-dl-exec')
const { Mutex } = require('async-mutex');

// Validate environment variables
const env = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  ALLOWED_ORIGINS: str({ default: "*" }), // Allow all origins by default
  REFERER_URL: str({ default: undefined })
});

const app = express();
const PORT = env.PORT;

// Initialize cache with a TTL of 5 hours
// Intended to last the duration of a watch party
const cache = new NodeCache({ stdTTL: 18000 });
// Use a mutex to avoid racing fetches
const cacheMutex = new Mutex();

// Logging middleware
app.use(morgan('dev'));

// Security headers middleware
app.use(helmet());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '../public')));

// CORS middleware - simplified
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Handle CORS preflight requests
app.options('*', (req, res) => {
  res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Proxy endpoint with caching
app.get('/api/v1/streamingProxy', async (req, res) => {
  try {
    // URL is already decoded
    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    const isM3U8 = url.endsWith(".m3u8");

    // Check cache for the URL
    const cachedResponse = cache.get(url);
    if (cachedResponse) {
      console.log(`Serving from cache: ${url}`);
      if (isM3U8) {
        res.set({
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=600" // 10 minutes
        });
      } else {
        res.set({
          "Content-Type": "video/mp2t",
          "Cache-Control": "public, max-age=31536000" // 1 year for segments
        });
      }
      return res.status(200).send(cachedResponse);
    }

    const response = await fetchWithCustomReferer(url, env.REFERER_URL);

    if (!response.ok) {
      return res.status(response.status).json({
        error: response.statusText,
        status: response.status
      });
    }

    if (isM3U8) {
      const playlistText = await response.text();
      const modifiedPlaylist = rewritePlaylistUrls(playlistText, url);

      // Cache the response
      cache.set(url, modifiedPlaylist);

      res.set({
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=600" // 10 minutes
      });
      return res.send(modifiedPlaylist);
    } else {
      const arrayBuffer = await response.arrayBuffer();

      // Cache the response
      cache.set(url, Buffer.from(arrayBuffer));

      res.set({
        "Content-Type": "video/mp2t",
        "Cache-Control": "public, max-age=31536000" // 1 year for segments
      });
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: "Failed to fetch data",
      details: error.message
    });
  }
});

app.get('/watch', async (req, res) => {
  const videoID = req.query.v;
  if (/^([\w-]{11})$/.test(videoID)) {
    // Use mutex to make cache check/load atomic.
    // Intended to block raced clients until the first completes and
    // primes the cache for the second
    return cacheMutex.runExclusive(async () => {
      const cachedResponse = cache.get(videoID);

      if (cachedResponse) {
        console.log(`Serving from cache: ${videoID}`);

        return cachedResponse;
      } else {
        console.log(`New request for: ${videoID}`);

        // Get m3u8 from yt-dlp
        return youtubedl(`https://www.youtube.com/watch?v=${videoID}`, {
          g: true,
          formatSort: "proto:m3u8",
        })
        .then(async (url) => {
          // Proxy m3u8 and rewrite URLs before caching and responding
          return fetchWithCustomReferer(url, env.REFERER_URL)
            .then(async (response) => {
              if (!response.ok) {
                return res.status(response.status).json({
                  error: response.statusText,
                  status: response.status
                });
              }
              // Tecnically thix promise leaks rejections but I'm choosing to not think about it
              const playlistData = await response.text();
              const modifiedPlaylist = rewritePlaylistUrls(playlistData, url);
              cache.set(videoID, modifiedPlaylist);

              return playlistData;
            });
        });
      }
    }).then(playlistData => {
      // Separate response code outside mutex to avoid blocking on data transfer
      res.set({
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=600" // 10 minutes
      });
      return res.status(200).send(playlistData);
    }).catch((error) => {
      res.status(500).json({
        error: "Failed to fetch playlist from yt-dlp",
        details: error.message
      });
    });
  } else {
    res.status(500).json({
      error: "Failed to validate video ID",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
