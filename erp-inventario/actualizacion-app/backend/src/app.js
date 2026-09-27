const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { corsOrigin } = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/api/auth/login', require('./middleware/loginLimiter'));
app.use('/api', routes);
app.use('/api', notFound);

// En producción el mismo servidor entrega la interfaz (frontend/dist)
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    maxAge: '1h',
    index: false,
    // El service worker y el manifiesto no se guardan en caché para que las actualizaciones lleguen enseguida
    setHeaders: (res, file) => {
      if (/(sw\.js|manifest\.webmanifest|index\.html)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(notFound);
app.use(errorHandler);

module.exports = app;
