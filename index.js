require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// MODELS
const User = mongoose.model('User', {
  email: String,
  password: String
});

const Restaurant = mongoose.model('Restaurant', {
  name: String,
  address: String,
  location: { type: { type: String }, coordinates: [Number] }, // GeoJSON
  menu: [{ name: String, price: Number }]
});

const Rider = mongoose.model('Rider', {
  name: String,
  location: { type: { type: String }, coordinates: [Number] },
  available: Boolean
});

const Order = mongoose.model('Order', {
  user: String,
  restaurant: String,
  rider: String,
  items: Array,
  address: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

// AUTH MIDDLEWARE
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// AUTH ROUTES
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });
  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// RESTAURANTS NEARBY
app.get('/restaurants', authenticateToken, async (req, res) => {
  const { lat, lng } = req.query;
  const restaurants = await Restaurant.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: 10000 // 10 km
      }
    }
  });
  res.json(restaurants);
});

// PLACE ORDER
app.post('/order', authenticateToken, async (req, res) => {
  const { restaurant, items, address, location } = req.body;
  // Assign nearest available rider
  const rider = await Rider.findOne({
    available: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: location },
        $maxDistance: 10000
      }
    }
  });
  const order = new Order({
    user: req.user.userId,
    restaurant,
    rider: rider ? rider._id : null,
    items,
    address,
    status: rider ? "ASSIGNED" : "PLACED"
  });
  await order.save();
  if (rider) await Rider.findByIdAndUpdate(rider._id, { available: false });
  res.json({ success: true, order });
});

// ORDER STATUS
app.get('/order/:id', authenticateToken, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('rider');
  res.json(order);
});

// DUMMY PAYMENT (replace with real Stripe checkout in production)
app.post('/pay', authenticateToken, async (req, res) => {
  const { amount, payment_method_id } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'inr',
      payment_method: payment_method_id,
      confirm: true
    });
    res.json({ success: true, paymentIntent });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
