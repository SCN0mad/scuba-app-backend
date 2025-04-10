const mongoose = require('mongoose');

const diverSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true },
  name: String,
  email: { type: String, unique: true },
  subscription: { type: String, enum: ['free', 'basic', 'advanced'], default: 'free' },
  certBody: String,
  certLevel: String,
  certDate: String,
  bio: String,
  profilePhoto: String,
  gallery: [String],
  diveLogs: [
    {
      date: String,
      location: String,
      depth: Number,
      notes: String,
    },
  ],
  bookings: [{
    diveCentreId: String,
    date: String,
    service: String,
    status: String,
  }],
});

module.exports = mongoose.model('Diver', diverSchema);