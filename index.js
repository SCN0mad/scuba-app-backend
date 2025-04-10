const express = require('express');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const socketIo = require('socket.io');
const http = require('http');
const Stripe = require('stripe');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json'),
});


// Dynamic CORS for local development
app.use(cors({
  origin: '*', // Allow all origins for now
  credentials: true,
}));

app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url, req.headers);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const upload = multer({ dest: 'uploads/' });

// Firebase Admin SDK Initialization
try {
  admin.initializeApp({
    credential: admin.credential.cert('./serviceAccountKey.json'),
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

// MongoDB Atlas Connection
mongoose.connect('mongodb+srv://scubaAdmin:darek18@sc0nomad.pr3kk.mongodb.net/scuba-app?retryWrites=true&w=majority&appName=SC0Nomad')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Connection error:', err));

// Models
const Message = mongoose.model('Message', new mongoose.Schema({
  senderId: String,
  receiverId: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
}));

// Token Middleware
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    console.log('No token provided for request:', req.url);
    return res.status(401).send('No token provided');
  }
  console.log('Verifying token:', token.substring(0, 50) + '...');
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('Token verified for user:', decoded.uid);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message, 'Token:', token);
    res.status(401).send('Invalid token');
  }
}

// Mount Routers with upload middleware
const diveCentresRouter = require('./routes/diveCentres')(upload, verifyToken);
app.use('/api/dive-centres', diveCentresRouter);

const diversRouter = require('./routes/divers')(upload, verifyToken);

// app.use('/api/dive-centres', diveCentresRouter);
app.use('/api/divers', diversRouter);

// Chat Routes
app.post('/api/messages/send', verifyToken, async (req, res) => {
  const { receiverId, content } = req.body;
  try {
    const message = new Message({ senderId: req.user.uid, receiverId, content });
    await message.save();
    io.emit('message', message);
    res.status(201).send(message);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/api/messages/:userId', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.uid, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.uid },
      ],
    }).sort({ timestamp: 1 });
    res.send(messages);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Socket.io Setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));