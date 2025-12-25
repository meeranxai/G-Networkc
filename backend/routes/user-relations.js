const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Profile Picture Upload
const storage = multer.diskStorage({
    destination: './uploads/avatars/',
    filename: function (req, file, cb) {
        cb(null, 'avatar-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB limit for avatars
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb('Error: Images Only!');
    }
}).single('avatar');

// @route   GET /api/users/:uid
// @desc    Get full user info
router.get('/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.params.uid });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/users/sync
// @desc    Sync Firebase user to MongoDB (Critical for Chat/Profile)
router.post('/sync', async (req, res) => {
    try {
        const { firebaseUid, displayName, email, photoURL } = req.body;

        // Find and update, or create if not exists
        const user = await User.findOneAndUpdate(
            { firebaseUid },
            {
                displayName,
                email,
                photoURL,
                lastSeen: new Date(),
                isOnline: true
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, user });
    } catch (err) {
        console.error("Sync Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @route   PUT /api/users/profile
// @desc    Update user profile & privacy
router.put('/profile', upload, async (req, res) => {
    try {
        const { userId, displayName, bio, privacy } = req.body;
        const user = await User.findOne({ firebaseUid: userId });

        if (!user) return res.status(404).json({ message: "User not found" });

        if (displayName) user.displayName = displayName;
        if (bio !== undefined) user.bio = bio;

        // Handle Privacy Updates
        if (privacy) {
            let privacyData = privacy;
            if (typeof privacy === 'string') {
                try {
                    privacyData = JSON.parse(privacy);
                } catch (e) {
                    console.error("Error parsing privacy JSON", e);
                }
            }
            // Merge with existing
            user.privacy = { ...user.privacy, ...privacyData };
        }

        if (req.file) {
            // Delete old avatar if it exists and is local
            if (user.photoURL && user.photoURL.startsWith('/uploads/avatars/')) {
                const oldPath = path.join(__dirname, '..', user.photoURL);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            user.photoURL = `/uploads/avatars/${req.file.filename}`;
        }

        await user.save();
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/users/follow
// @desc    Follow a user
router.post('/follow', async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        if (followerId === followingId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const follower = await User.findOne({ firebaseUid: followerId });
        const following = await User.findOne({ firebaseUid: followingId });

        if (!follower || !following) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add to following list
        if (!follower.following.includes(followingId)) {
            follower.following.push(followingId);
            await follower.save();
        }

        // Add to followers list
        if (!following.followers.includes(followerId)) {
            following.followers.push(followerId);
            await following.save();

            // Create Notification
            const newNotif = new Notification({
                recipient: followingId,
                sender: followerId,
                senderName: follower.displayName,
                senderAvatar: follower.photoURL,
                type: 'follow',
                content: 'started following you'
            });
            await newNotif.save();

            // Emit Socket event to followingId's room
            const io = req.app.get('socketio');
            if (io) {
                // Emit to the specific user being followed
                io.to(followingId).emit('notification', newNotif);

                // Also emit a general update for profile stats
                io.emit('user_followed', {
                    followerId,
                    followingId,
                    followersCount: following.followers.length,
                    followingCount: following.following.length // though follower's following changed
                });
            }
        }

        res.json({ success: true, message: 'Followed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/users/unfollow
// @desc    Unfollow a user
router.post('/unfollow', async (req, res) => {
    try {
        const { followerId, followingId } = req.body;

        const follower = await User.findOne({ firebaseUid: followerId });
        const following = await User.findOne({ firebaseUid: followingId });

        if (!follower || !following) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove from following list
        follower.following = follower.following.filter(uid => uid !== followingId);
        await follower.save();

        // Remove from followers list
        following.followers = following.followers.filter(uid => uid !== followerId);
        await following.save();

        const io = req.app.get('socketio');
        if (io) {
            io.emit('user_followed', {
                followerId,
                followingId,
                followersCount: following.followers.length,
                action: 'unfollow'
            });
        }

        res.json({ success: true, message: 'Unfollowed successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users/stats/:uid
// @desc    Get user follow stats
router.get('/stats/:uid', async (req, res) => {
    try {
        const user = await User.findOne({ firebaseUid: req.params.uid });
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({
            followersCount: user.followers.length,
            followingCount: user.following.length,
            followers: user.followers,
            following: user.following
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
