// Webhook en Node.js para subir imagen y postear tweet con texto
// Requiere: express, multer, axios, oauth-1.0a, crypto

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const fs = require('fs');
const app = express();
const upload = multer({ dest: 'uploads/' });

// 🔐 Tus claves de desarrollador de Twitter
const oauth = OAuth({
  consumer: {
    key: 'prYr7cGZjgIT4MDHlKgUsXGFl',
    secret: '50lQ9fyuSGOZxwP2UURWWIw600Cxz3pPAIrYJmndS2s5rqwjLq'
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

const token = {
  key: '1716230471598678016-FDwFFATn14KimSlQyQm8eQm70sxSjV',
  secret: 'LOLCPkZodpwRgVvUFAO3WrWmDNXsSx4fRija5jfRGfQ3F'
};

app.post('/tweet', upload.single('media'), async (req, res) => {
  try {
    const text = req.body.text;
    const mediaPath = req.file.path;

    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!mediaPath) {
      throw new Error('No se recibió archivo en el campo "media"');
    }

    // Leer la imagen como binario
    const mediaData = fs.readFileSync(mediaPath);

    // 1. Subir imagen a Twitter
    const mediaUploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const authHeaderUpload = oauth.toHeader(oauth.authorize({ url: mediaUploadUrl, method: 'POST' }, token));

    const mediaResponse = await axios.post(mediaUploadUrl, mediaData, {
      headers: {
        ...authHeaderUpload,
        'Content-Type': 'application/octet-stream',
        'Content-Length': mediaData.length
      },
      params: {
        media_category: 'tweet_image'
      }
    });

    const media_id = mediaResponse.data.media_id_string;

    // 2. Postear el tweet
    const tweetUrl = 'https://api.twitter.com/1.1/statuses/update.json';
    const authHeaderTweet = oauth.toHeader(oauth.authorize({ url: tweetUrl, method: 'POST' }, token));

    const tweetResponse = await axios.post(tweetUrl, null, {
      headers: {
        ...authHeaderTweet,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        status: text,
        media_ids: media_id
      }
    });

    res.json({ success: true, tweet: tweetResponse.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    fs.unlinkSync(req.file.path); // borrar el archivo temporal
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
