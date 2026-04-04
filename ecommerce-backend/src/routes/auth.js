const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Validation functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@])[A-Za-z\d@]{8,}$/;
  return passwordRegex.test(password);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

// GET ALL USERS (ADMIN ONLY)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SIGNUP/REGISTER
router.post('/signup', async (req, res) => {
  try {
    const usernameTrimmed = String(req.body.username || '').trim();
    const mobileTrimmed = String(req.body.mobile || '').trim();
    const emailTrimmed = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    // Validation
    if (!usernameTrimmed || !mobileTrimmed || !emailTrimmed || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (usernameTrimmed.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }

    if (!validateEmail(emailTrimmed)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!validatePhone(mobileTrimmed)) {
      return res.status(400).json({ message: 'Mobile must be 10 digits' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must have uppercase, lowercase, number & @ symbol (min 8 chars)' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: emailTrimmed }, { mobile: mobileTrimmed }, { username: usernameTrimmed }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username, email, or mobile already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username: usernameTrimmed,
      mobile: mobileTrimmed,
      email: emailTrimmed,
      password: hashedPassword,
      createdAt: new Date()
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

    // Return user data (excluding password)
    const userData = {
      id: newUser._id,
      username: newUser.username,
      mobile: newUser.mobile,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      message: 'Signup successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    if (error && error.code === 11000) {
      return res.status(400).json({ message: 'Username, email, or mobile already registered' });
    }
    res.status(500).json({ message: 'Server error during signup' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/mobile and password required' });
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email: identifier }, { mobile: identifier }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user data (excluding password)
    const userData = {
      id: user._id,
      username: user.username,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      user: userData,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// VALIDATE TOKEN
router.get('/validate', require('../middleware/auth'), async (req, res) => {
  try {
    // If we reach here, token is valid (middleware passed)
    res.json({ valid: true, user: req.user });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
});

module.exports = router;
