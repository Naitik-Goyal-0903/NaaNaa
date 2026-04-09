const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Template = require('./src/models/Template');

dotenv.config();

const requireEnv = (name, fallback = "") => {
  const value = String(process.env[name] || fallback).trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const seed = async () => {
  try {
    await connectDB();
    console.log('✓ Database connected');
    
    // create admin
    const ADMIN_USERNAME = requireEnv('SEED_ADMIN_USERNAME', 'admin');
    const ADMIN_PASS = requireEnv('SEED_ADMIN_PASSWORD');
    const ADMIN_EMAIL = requireEnv('SEED_ADMIN_EMAIL', 'admin@naananaa.local');
    const ADMIN_MOBILE = requireEnv('SEED_ADMIN_MOBILE', '9999999999');
    let admin = await User.findOne({
      $or: [
        { username: ADMIN_USERNAME },
        { email: ADMIN_EMAIL },
        { mobile: ADMIN_MOBILE }
      ]
    });

    if (!admin) {
      const hashed = await bcrypt.hash(ADMIN_PASS, 10);
      admin = new User({
        name: 'Admin',
        email: ADMIN_EMAIL,
        mobile: ADMIN_MOBILE,
        username: ADMIN_USERNAME,
        password: hashed,
        role: 'admin'
      });
      await admin.save();
      console.log('✓ Admin user created:', ADMIN_USERNAME);
    } else {
      if (admin.username !== ADMIN_USERNAME || admin.email !== ADMIN_EMAIL || admin.mobile !== ADMIN_MOBILE || admin.role !== 'admin') {
        admin.username = ADMIN_USERNAME;
        admin.email = ADMIN_EMAIL;
        admin.mobile = ADMIN_MOBILE;
        admin.role = 'admin';
        admin.password = await bcrypt.hash(ADMIN_PASS, 10);
        await admin.save();
        console.log('✓ Existing admin user updated:', ADMIN_USERNAME);
      } else {
        console.log('✓ Admin already exists');
      }
    }

    // seed products
    const existing = await Product.countDocuments();
    if (existing === 0) {
      const products = [
        {
          name: 'Premium Hoodie',
          price: 2999,
          image: 'https://picsum.photos/seed/hoodie-main/700/900',
          images: [
            'https://picsum.photos/seed/hoodie-main/700/900',
            'https://picsum.photos/seed/hoodie-side/700/900',
            'https://picsum.photos/seed/hoodie-back/700/900'
          ],
          category: 'Men\'s',
          description: 'Cozy premium hoodie with soft inner fleece.',
          stock: 50,
          sizes: ['S', 'M', 'L', 'XL']
        },
        {
          name: 'Classic T-Shirt',
          price: 999,
          image: 'https://picsum.photos/seed/tshirt-main/700/900',
          images: [
            'https://picsum.photos/seed/tshirt-main/700/900',
            'https://picsum.photos/seed/tshirt-side/700/900',
            'https://picsum.photos/seed/tshirt-detail/700/900'
          ],
          category: 'Men\'s',
          description: 'Timeless classic with breathable cotton fabric.',
          stock: 100,
          sizes: ['S', 'M', 'L', 'XL', 'XXL']
        },
        {
          name: 'Denim Jeans',
          price: 3499,
          image: 'https://picsum.photos/seed/jeans-main/700/900',
          images: [
            'https://picsum.photos/seed/jeans-main/700/900',
            'https://picsum.photos/seed/jeans-back/700/900',
            'https://picsum.photos/seed/jeans-fabric/700/900'
          ],
          category: 'Men\'s',
          description: 'Premium stretch denim with tailored fit.',
          stock: 75,
          sizes: ['30', '32', '34', '36', '38']
        },
        {
          name: 'Leather Jacket',
          price: 5999,
          image: 'https://picsum.photos/seed/jacket-main/700/900',
          images: [
            'https://picsum.photos/seed/jacket-main/700/900',
            'https://picsum.photos/seed/jacket-side/700/900',
            'https://picsum.photos/seed/jacket-zip/700/900'
          ],
          category: 'Women\'s',
          description: 'Stylish leather jacket for modern streetwear looks.',
          stock: 30,
          sizes: ['S', 'M', 'L']
        },
        {
          name: 'Casual Sneakers',
          price: 4499,
          image: 'https://picsum.photos/seed/sneakers-main/700/900',
          images: [
            'https://picsum.photos/seed/sneakers-main/700/900',
            'https://picsum.photos/seed/sneakers-side/700/900',
            'https://picsum.photos/seed/sneakers-sole/700/900'
          ],
          category: 'Accessories',
          description: 'Comfortable daily wear sneakers with cushioned sole.',
          stock: 60,
          sizes: ['6', '7', '8', '9', '10']
        }
      ];
      await Product.insertMany(products);
      console.log('✓ Sample products inserted');
    } else {
      console.log('✓ Products already exist');
    }

    // seed templates
    const existingTemplates = await Template.countDocuments();
    if (existingTemplates === 0) {
      const templates = [
        {
          badge: 'NEW DROP',
          title: 'Streetwear Reloaded',
          subtitle: 'Limited silhouettes built for everyday movement.',
          buttonText: 'Shop New In',
          targetCategory: "Men's",
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
          overlay: 'linear-gradient(180deg, rgba(2,6,23,0.15) 0%, rgba(2,6,23,0.55) 100%)',
          mediaUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
          mediaType: 'image'
        },
        {
          badge: 'SEASON ESSENTIALS',
          title: 'Minimal Summer Edit',
          subtitle: 'Clean tones, lighter fabrics, premium comfort.',
          buttonText: 'Explore Collection',
          targetCategory: "Women's",
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          overlay: 'linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.35) 100%)',
          mediaUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=80',
          mediaType: 'image'
        },
        {
          badge: 'EDITOR PICK',
          title: 'Monochrome Essentials',
          subtitle: 'Sharp cuts and timeless textures for every day.',
          buttonText: 'View Edit',
          targetCategory: 'Accessories',
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)',
          overlay: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)',
          mediaUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
          mediaType: 'image'
        }
      ];

      await Template.insertMany(templates);
      console.log('✓ Sample templates inserted');
    } else {
      console.log('✓ Templates already exist');
    }

    console.log('\n✓ Seeding complete!');
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database error:', err.message);
    if (String(err.message || '').includes('Missing required environment variable')) {
      console.error('\n⚠️  Add seed admin credentials in .env before running seed:');
      console.error('  SEED_ADMIN_USERNAME=admin');
      console.error('  SEED_ADMIN_PASSWORD=your_strong_password');
      console.error('  SEED_ADMIN_EMAIL=admin@naananaa.local');
    } else {
      console.error('\n⚠️  MongoDB is not running. To set up:');
      console.error('  Option 1: Install MongoDB & run mongod');
      console.error('  Option 2: Use Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
      console.error('  Option 3: Use MongoDB Atlas: Update MONGODB_URI in .env with your connection string');
    }
    mongoose.disconnect();
    process.exit(1);
  }
};

seed();
