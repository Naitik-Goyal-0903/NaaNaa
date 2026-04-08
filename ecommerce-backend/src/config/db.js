const mongoose = require('mongoose');

const validateMongoUri = (candidateUri) => {
  const raw = String(candidateUri || '').trim();
  if (!raw) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }

  if (/[<>]/.test(raw)) {
    throw new Error('MONGODB_URI contains angle brackets. Paste the URI without < or > characters.');
  }

  const pathMatch = raw.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)(\?.*)?$/i);
  if (!pathMatch || !String(pathMatch[1] || '').trim()) {
    throw new Error('MONGODB_URI is missing the database name. Add /NaaNaa before the query string.');
  }

  return raw;
};

const connectDB = async () => {
  const uri = validateMongoUri(process.env.MONGODB_URI || 'mongodb://localhost:27017/naananaa');
  const directUri = process.env.MONGODB_URI_DIRECT;

  const connectWithUri = async (candidateUri) => {
    await mongoose.connect(candidateUri, { useNewUrlParser: true, useUnifiedTopology: true });
  };

  try {
    await connectWithUri(uri);
    console.log('MongoDB connected');
  } catch (err) {
    if (directUri && directUri !== uri) {
      try {
        console.warn('Primary MongoDB URI failed. Retrying with direct host URI...');
        await connectWithUri(directUri);
        console.log('MongoDB connected (direct host URI)');
        return;
      } catch (directErr) {
        console.error('MongoDB connection error (direct URI):', directErr.message);
        process.exit(1);
      }
    }

    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
