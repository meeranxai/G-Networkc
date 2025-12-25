const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: false,
        default: 'New Post'
    },
    description: {
        type: String, // The caption
        required: false
    },
    image: {
        type: String, // URL to the image
        required: false
    },
    category: {
        type: String,
        default: 'Social'
    },
    // In a real app, this would be a reference to a User model
    author: {
        type: String,
        default: 'Tech User'
    },
    authorId: {
        type: String, // Firebase UID of the author
        required: true,
        index: true
    },
    authorAvatar: String,
    hashtags: [{
        type: String,
        index: true
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    lastEditedAt: {
        type: Date
    },
    likes: [{
        type: String // Array of Firebase UIDs
    }],
    comments: [{
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        userAvatar: { type: String },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);
