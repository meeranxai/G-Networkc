const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: String, // Firebase UID of the user receiving the notification
        required: true,
        index: true
    },
    sender: {
        type: String, // Firebase UID of the user who triggered the event
        required: true
    },
    senderName: String,
    senderAvatar: String,
    type: {
        type: String,
        enum: ['like', 'comment', 'mention', 'follow'],
        required: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    content: String, // E.g., "liked your post" or "commented: 'Nice!'"
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
