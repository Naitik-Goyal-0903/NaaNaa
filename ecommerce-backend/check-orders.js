const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const Order = require('./src/models/Order');

dotenv.config();

const checkOrders = async () => {
  try {
    await connectDB();
    console.log('✓ Database connected');

    const orders = await Order.find({}).sort({ createdAt: -1 });
    console.log('Orders in DB:', orders.length);
    orders.forEach(order => {
      console.log(`- ID: ${order._id}, UserId: ${order.userId}, Name: ${order.name}, Status: ${order.status}`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.disconnect();
  }
};

checkOrders();