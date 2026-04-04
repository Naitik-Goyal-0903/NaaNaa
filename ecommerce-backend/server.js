const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

dotenv.config();
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

const corsOptions = {
	origin(origin, callback) {
		// Allow non-browser tools and same-origin server requests.
		if (!origin) return callback(null, true);
		if (allowedOrigins.length === 0) return callback(null, true);
		if (allowedOrigins.includes(origin)) return callback(null, true);
		return callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle OPTIONS requests
app.options('*', cors(corsOptions));

// connect
connectDB();

// routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/wishlist', require('./src/routes/wishlist'));
app.use('/api/templates', require('./src/routes/templates'));

app.get('/', (req, res) => res.send('NaaNaa ecommerce backend'));

app.use((err, req, res, next) => {
	if (err && (err.type === 'entity.too.large' || err.status === 413)) {
		return res.status(413).json({ msg: 'Payload too large' });
	}
	if (err) {
		console.error('Unhandled server error:', err.message);
		return res.status(500).json({ msg: 'Server error' });
	}
	next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
