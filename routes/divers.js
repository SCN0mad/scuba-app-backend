const express = require('express');

module.exports = (upload, verifyToken) => {
  const router = express.Router();
  const Diver = require('../models/Diver');
  const DiveCentre = require('../models/DiveCentre');

  // Register a diver
  router.post('/register', verifyToken, async (req, res) => {
    try {
      const { name, email, subscription, certBody, certLevel, certDate } = req.body;
      const diver = new Diver({
        firebaseUid: req.user.uid,
        name,
        email,
        subscription,
        certBody,
        certLevel,
        certDate,
      });
      await diver.save();
      res.status(201).json(diver);
    } catch (err) {
      res.status(400).send('Error registering diver: ' + err.message);
    }
  });

  // Get diver profile
  router.get('/:uid', verifyToken, async (req, res) => {
    try {
      const diver = await Diver.findOne({ firebaseUid: req.params.uid });
      if (!diver) return res.status(404).send('Diver not found');
      res.json(diver);
    } catch (err) {
      res.status(500).send('Error fetching diver: ' + err.message);
    }
  });

  // Update diver profile (bio, etc.)
  router.put('/:uid', verifyToken, async (req, res) => {
    const { bio } = req.body;
    try {
      const diver = await Diver.findOneAndUpdate(
        { firebaseUid: req.params.uid },
        { bio },
        { new: true }
      );
      if (!diver) return res.status(404).send('Diver not found');
      res.send(diver);
    } catch (error) {
      console.error('Update diver error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Upload profile photo
  router.post('/:uid/photo', verifyToken, upload.single('photo'), async (req, res) => {
    try {
      const diver = await Diver.findOne({ firebaseUid: req.params.uid });
      if (!diver) return res.status(404).send('Diver not found');
      if (!req.file) return res.status(400).send('No photo uploaded');
      const photoUrl = `/uploads/${req.file.filename}`;
      diver.profilePhoto = photoUrl;
      await diver.save();
      res.send(diver);
    } catch (error) {
      console.error('Photo upload error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Add gallery photo
  router.post('/:uid/gallery', verifyToken, upload.single('photo'), async (req, res) => {
    try {
      const diver = await Diver.findOne({ firebaseUid: req.params.uid });
      if (!diver) return res.status(404).send('Diver not found');
      if (!req.file) return res.status(400).send('No photo uploaded');
      const photoUrl = `/uploads/${req.file.filename}`;
      diver.gallery.push(photoUrl);
      await diver.save();
      res.send(diver);
    } catch (error) {
      console.error('Gallery upload error:', error.message);
      res.status(500).send(error.message);
    }
  });

  // Book a dive
  router.post('/book', verifyToken, async (req, res) => {
    try {
      const { diveCentreId, startDate, service, message } = req.body;
      const diver = await Diver.findOne({ firebaseUid: req.user.uid });
      if (!diver) return res.status(404).send('Diver not found');

      const diveCentre = await DiveCentre.findOne({ firebaseUid: diveCentreId });
      if (!diveCentre) return res.status(404).send('Dive centre not found');

      // Add booking to diver
      const diverBooking = {
        diveCentreId,
        date: startDate,
        service,
        status: 'pending',
      };
      diver.bookings.push(diverBooking);
      await diver.save();

      // Add booking to dive centre
      const centreBooking = {
        diverId: req.user.uid,
        date: startDate,
        service,
        status: 'pending',
        message, // Include the message
      };
      diveCentre.bookings.push(centreBooking);
      await diveCentre.save();

      res.status(201).json({ message: 'Booking request sent' });
    } catch (err) {
      res.status(400).send('Error booking dive: ' + err.message);
    }
  });

  // Search divers by name (for autofill)
 router.get('/search', verifyToken, async (req, res) => {
  try {
    const searchTerm = req.query.name || ''; // Get name from query param
    const limit = parseInt(req.query.limit || '10', 10); // Optional limit

    console.log(`Searching for divers with name like: "${searchTerm}"`); // Log search term

    if (!searchTerm) {
      return res.json({ results: [] }); // Return empty if no search term
    }

    // Create the search query
    // $regex provides pattern matching capabilities (like SQL's LIKE)
    // $options: 'i' makes the search case-insensitive
    const query = {
      name: { $regex: searchTerm, $options: 'i' },
    };

    console.log('MongoDB Diver Search Query:', query); // Log the query

    // Find divers matching the query, limit results, and select specific fields
    const divers = await Diver.find(query)
                               .limit(limit)
                               .select('name firebaseUid profilePhoto email') // Select fields needed for suggestions/profile view
                               .exec(); // Execute the query

    console.log('Found divers:', divers.length); // Log number found

    res.status(200).json({ results: divers }); // Send back the results

  } catch (err) {
    console.error('Error searching divers:', err.message);
    res.status(500).send('Error searching divers: ' + err.message);
  }
});

  return router;
};