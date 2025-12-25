// firebase-config.js
// Firebase configuration file - Keep this separate for security

export const firebaseConfig = {
  apiKey: "AIzaSyD8Sg8rBwkCS4BYwgVrb_V_KQ4eMd0PkZ0",
  authDomain: "g-network-community.firebaseapp.com",
  projectId: "g-network-community",
  storageBucket: "g-network-community.firebasestorage.app",
  messagingSenderId: "358032029950",
  appId: "1:358032029950:web:a8dc470de9d85ead240daf"
};

// Collections and paths
export const COLLECTIONS = {
  USER_PROFILES: "userProfiles",
  ARTICLES: "articles",
  COMMENTS: "comments",
  BOOKMARKS: "bookmarks",
  NOTIFICATIONS: "notifications"
};

// Storage paths
export const STORAGE_PATHS = {
  PROFILE_PICTURES: "profile-pictures",
  ARTICLE_IMAGES: "article-images",
  BANNER_IMAGES: "banner-images"
};

// Default values
export const DEFAULTS = {
  PROFILE: {
    displayName: "User",
    bio: "",
    location: "",
    social: {
      github: "",
      linkedin: "",
      twitter: "",
      website: ""
    },
    stats: {
      profileViews: 0,
      articleCount: 0,
      followers: 0,
      likes: 0
    },
    settings: {
      twoFactorEnabled: false,
      emailVerified: false,
      lastPasswordChange: null
    },
    membership: {
      plan: "Free",
      status: "Active",
      joinDate: null,
      renewalDate: null
    }
  }
};

// Validation constants
export const VALIDATION = {
  MAX_BIO_LENGTH: 500,
  MAX_NAME_LENGTH: 50,
  MAX_LOCATION_LENGTH: 100,
  MAX_URL_LENGTH: 500,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
};