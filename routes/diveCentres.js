const express = require('express');
const Diver = require('../models/Diver');
const DiveCentre = require('../models/DiveCentre');

module.exports = (upload, verifyToken) => {
  const router = express.Router();

  // Register a dive centre
  router.post('/register', verifyToken, async (req, res) => {
    try {
      const { name, email, address, diveTypes, availability } = req.body;
      const diveCentre = new DiveCentre({
        firebaseUid: req.user.uid,
        name,
        email,
        address: typeof address === 'string' ? JSON.parse(address) : address,
        diveTypes: typeof diveTypes === 'string' ? JSON.parse(diveTypes) : diveTypes,
        availability: availability || [],
      });
      await diveCentre.save();
      res.status(201).json(diveCentre);
    } catch (err) {
      res.status(400).send('Error registering dive centre: ' + err.message);
    }
  });

  // Get dive centre profile
  router.get('/:uid', verifyToken, async (req, res) => {
    try {
      const diveCentre = await DiveCentre.findOne({ firebaseUid: req.params.uid });
      if (!diveCentre) return res.status(404).send('Dive centre not found');
      res.json(diveCentre);
    } catch (err) {
      res.status(500).send('Error fetching dive centre: ' + err.message);
    }
  });

  // Update dive centre (services, availability)
  router.put('/:uid', verifyToken, async (req, res) => {
    try {
      const { services, availability } = req.body;
      const diveCentre = await DiveCentre.findOneAndUpdate(
        { firebaseUid: req.params.uid },
        { services, availability },
        { new: true }
      );
      if (!diveCentre) return res.status(404).send('Dive centre not found');
      res.json(diveCentre);
    } catch (err) {
      res.status(500).send('Error updating dive centre: ' + err.message);
    }
  });

  // Search dive centres
  router.get('/search', verifyToken, async (req, res) => {
    try {
      console.log('Search route hit with headers:', req.headers);
      console.log('Authenticated user:', req.user ? req.user.uid : 'No user');
      const { address, city, country, maxPrice, diveTypes, startDate, endDate } = req.query;
      const query = {};
  
      console.log('Search query params:', { address, city, country, maxPrice, diveTypes, startDate, endDate });
  
      if (address) query['address.addressLine1'] = { $regex: address, $options: 'i' };
      if (city) query['address.city'] = { $regex: city, $options: 'i' };
      if (country) query['address.country'] = { $regex: country, $options: 'i' };
      if (diveTypes) {
        const typesArray = diveTypes.split(',');
        query.diveTypes = { $in: typesArray };
      }
      if (maxPrice) {
        query['services.price'] = { $lte: parseFloat(maxPrice) };
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.availability = {
          $elemMatch: {
            date: { $gte: start.toISOString(), $lte: end.toISOString() },
            available: true,
          },
        };
      }
  
      console.log('Executing MongoDB Query:', JSON.stringify(query, null, 2));
  
      const diveCentres = await DiveCentre.find(query);
      console.log('Found dive centres:', diveCentres.length, diveCentres);
  
      res.status(200).json({ results: diveCentres });
    } catch (err) {
      console.error('Error in search route:', err.message, err.stack);
      res.status(500).send('Error searching dive centres: ' + err.message);
    }
  });

  // Upload logo photo
  router.post('/:uid/logo', verifyToken, upload.single('photo'), async (req, res) => {
    try {
      const diveCentre = await DiveCentre.findOne({ firebaseUid: req.params.uid });
      if (!diveCentre) return res.status(404).send('Dive centre not found');
      if (!req.file) return res.status(400).send('No photo uploaded');
      const photoUrl = `/uploads/${req.file.filename}`;
      diveCentre.logoPhoto = photoUrl;
      await diveCentre.save();
      console.log('Logo photo uploaded:', photoUrl);
      res.send(diveCentre);
    } catch (error) {
      console.error('Logo upload error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Upload profile photo
  router.post('/:uid/photo', verifyToken, upload.single('photo'), async (req, res) => {
    try {
      const diveCentre = await DiveCentre.findOne({ firebaseUid: req.params.uid });
      if (!diveCentre) return res.status(404).send('Dive centre not found');
      if (!req.file) return res.status(400).send('No photo uploaded');
      const photoUrl = `/uploads/${req.file.filename}`;
      diveCentre.profilePhoto = photoUrl;
      await diveCentre.save();
      console.log('Profile photo uploaded:', photoUrl);
      res.send(diveCentre);
    } catch (error) {
      console.error('Photo upload error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Add gallery photo
  router.post('/:uid/gallery', verifyToken, upload.single('photo'), async (req, res) => {
    try {
      const diveCentre = await DiveCentre.findOne({ firebaseUid: req.params.uid });
      if (!diveCentre) return res.status(404).send('Dive centre not found');
      if (!req.file) return res.status(400).send('No photo uploaded');
      const photoUrl = `/uploads/${req.file.filename}`;
      diveCentre.gallery.push(photoUrl);
      await diveCentre.save();
      console.log('Gallery photo uploaded:', photoUrl);
      res.send(diveCentre);
    } catch (error) {
      console.error('Gallery upload error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Get diver details for a booking
  router.get('/diver/:diverId', verifyToken, async (req, res) => {
    try {
      const diver = await Diver.findOne({ firebaseUid: req.params.diverId });
      if (!diver) return res.status(404).send('Diver not found');
      // Return only relevant fields: name, qualifications, and dive logs
      const diverDetails = {
        name: diver.name,
        email: diver.email,
        qualifications: {
          certBody: diver.certBody,
          certLevel: diver.certLevel,
          certDate: diver.certDate,
        },
        diveLogs: diver.diveLogs,
      };
      res.json(diverDetails);
    } catch (err) {
      res.status(500).send('Error fetching diver details: ' + err.message);
    }
  });

  return router;
};