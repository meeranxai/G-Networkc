const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Image Upload
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'post-' + Date.now() + path.extname(file.originalname));
    }
});

// Init Upload
/* 
   NOTE: In a production environment, you might upload to S3 or Cloudinary.
   For this local backend, we save files to the 'uploads' folder 
   and serve them statically.
*/
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// @route   GET /api/posts
// @desc    Get all posts (Feed) or Filter by Author with Pagination
router.get('/', async (req, res) => {
    try {
        const { authorId, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        let query = {};
        if (authorId) {
            query.authorId = authorId;
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Check if there are more posts
        const total = await Post.countDocuments(query);
        const hasMore = (skip + posts.length) < total;

        res.json({
            posts,
            hasMore,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/posts
// @desc    Create a new post
router.post('/', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        } else {
            const { description, author, authorId, authorAvatar, hashtags } = req.body;
            if (!authorId) return res.status(400).json({ message: 'authorId is required' });

            let hashtagsArray = [];
            try {
                hashtagsArray = hashtags ? JSON.parse(hashtags) : [];
            } catch (e) {
                console.error("Hashtag parse error:", e);
            }

            const newPost = new Post({
                description,
                image: req.file ? `/uploads/${req.file.filename}` : null, // Serve relative path
                author: author || "Tech User",
                authorId,
                authorAvatar,
                hashtags: hashtagsArray
            });

            try {
                const savedPost = await newPost.save();
                res.status(201).json(savedPost);
            } catch (err) {
                res.status(400).json({ message: err.message });
            }
        }
    });
});

// @route   PUT /api/posts/:id/like
// @desc    Toggle like (User-specific)
router.put('/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'UserId is required' });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex > -1) {
            // Already liked, so remove it (unlike)
            post.likes.splice(likeIndex, 1);
        } else {
            // Not liked, so add it
            post.likes.push(userId);
        }

        await post.save();

        // Emit Socket Events & Create Notifications
        const io = req.app.get('socketio');

        // Create notification ONLY for like (not unlike) and only if it's not the author liking their own post
        const isLiking = post.likes.includes(userId);
        if (isLiking && post.authorId !== userId) {
            try {
                const { userName, userAvatar } = req.body;
                const notif = new Notification({
                    recipient: post.authorId,
                    sender: userId,
                    senderName: userName || 'Someone',
                    senderAvatar: userAvatar,
                    type: 'like',
                    postId: post._id,
                    content: 'liked your post'
                });
                await notif.save();

                if (io) {
                    io.to(post.authorId).emit('new_notification', notif);
                }
            } catch (err) {
                console.error('Notification Error:', err);
            }
        }

        if (io) {
            io.emit('post_liked', {
                postId: post._id,
                likes: post.likes,
                likesCount: post.likes.length,
                userId: userId
            });
        }

        res.json({ likes: post.likes, likesCount: post.likes.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/posts/:id/comment
// @desc    Add a comment to a post
router.post('/:id/comment', async (req, res) => {
    try {
        const { userId, userName, userAvatar, text } = req.body;
        if (!userId || !text) return res.status(400).json({ message: 'UserId and text are required' });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const newComment = {
            userId,
            userName: userName || 'Anonymous',
            userAvatar,
            text,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await post.save();

        // Emit Socket Events & Create Notifications
        const io = req.app.get('socketio');

        // Notification for comment
        if (post.authorId !== userId) {
            try {
                const notif = new Notification({
                    recipient: post.authorId,
                    sender: userId,
                    senderName: userName,
                    senderAvatar: userAvatar,
                    type: 'comment',
                    postId: post._id,
                    content: `commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
                });
                await notif.save();

                if (io) {
                    io.to(post.authorId).emit('new_notification', notif);
                }
            } catch (err) {
                console.error('Notification Error:', err);
            }
        }

        if (io) {
            io.emit('new_comment', {
                postId: post._id,
                comment: newComment,
                commentCount: post.comments.length
            });
        }

        res.status(201).json(newComment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/posts/search
// @desc    Search posts
router.get('/search', async (req, res) => {
    const term = req.query.q;
    if (!term) return res.json([]);

    try {
        // Simple Regex Search
        const regex = new RegExp(term, 'i');
        const query = {
            $or: [
                { description: regex },
                { title: regex },
                { category: regex },
                { hashtags: { $in: [term.replace('#', '').toLowerCase()] } }
            ]
        };

        const posts = await Post.find(query).sort({ createdAt: -1 });

        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/posts/trending-hashtags
// @desc    Get top trending hashtags
router.get('/trending-hashtags', async (req, res) => {
    try {
        const posts = await Post.find({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        const hashtagCounts = {};
        posts.forEach(post => {
            if (post.hashtags) {
                post.hashtags.forEach(tag => {
                    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
                });
            }
        });

        const trending = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));

        res.json(trending);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check ownership
        if (post.authorId !== userId) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own posts' });
        }

        await post.deleteOne();
        res.json({ success: true, message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/posts/:id
// @desc    Update a post (with potential image change)
router.put('/:id', (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err });

        try {
            const { userId, description, removeImage } = req.body;
            const post = await Post.findById(req.params.id);

            if (!post) return res.status(404).json({ message: 'Post not found' });

            // Check ownership
            if (post.authorId !== userId) {
                return res.status(403).json({ message: 'Unauthorized to edit this post' });
            }

            if (description !== undefined) {
                post.description = description;
                post.isEdited = true;
                post.lastEditedAt = Date.now();

                // Re-extract hashtags
                const regex = /#(\w+)/g;
                const matches = description.match(regex);
                post.hashtags = matches ? matches.map(m => m.toLowerCase().replace('#', '')) : [];
            }

            // Image Modification Logic
            if (req.file) {
                // Delete old image if it exists
                if (post.image) {
                    const oldPath = path.join(__dirname, '..', post.image);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                post.image = `/uploads/${req.file.filename}`;
            } else if (removeImage === 'true') {
                // User explicitly wants to remove the image
                if (post.image) {
                    const oldPath = path.join(__dirname, '..', post.image);
                    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                }
                post.image = null;
            }

            await post.save();
            res.json(post);
        } catch (err) {
            console.error("PUT Error:", err);
            res.status(500).json({ message: err.message });
        }
    });
});

module.exports = router;
