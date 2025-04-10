const mongoose = require('mongoose');

const diveCentreSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true },
  name: String,
  email: { type: String, unique: true },
  address: {
    addressLine1: String,
    city: String,
    country: String,
  },
  diveTypes: [String],
  logoPhoto: String,
  profilePhoto: String,
  gallery: [String],
  services: [{
    name: String,
    price: Number,
  }],
  availability: [{
    date: String,
    available: Boolean,
  }],
  bookings: [{
    diverId: String,
    date: String,
    service: String,
    status: String,
    message: String,
  }],
  reviews: [{
    reviewerId: String,
    rating: Number,
    comment: String,
  }],
});

// Explicitly set collection name to match the actual collection
module.exports = mongoose.model('DiveCentre', diveCentreSchema, 'divecentres');