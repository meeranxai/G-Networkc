# Improved Firestore Security Rules

## Current Issues & Improvements:

### 1. **Chat Function Optimization Issue**
```javascript
// PROBLEM: Multiple get() calls in chatDoc() function
function chatDoc() {
  return get(/databases/$(database)/documents/chats/$(chatId));
}

// BETTER: Use resource directly when possible
function isChatParticipant() {
  return isAuthenticated() && resource.data.participants.hasAny([request.auth.uid]);
}
```

### 2. **Rate Limiting Missing**
Add validation for spam prevention:
```javascript
// Add to articles create
allow create: if isAuthenticated() && 
  request.resource.data.keys().hasAll(['title', 'content', 'authorUid']) &&
  request.resource.data.title.size() > 0 &&
  request.resource.data.content.size() > 0;
```

### 3. **Data Validation Missing**
```javascript
// Add to users create/update
allow create: if isAuthenticated() && 
  request.auth.uid == userId &&
  request.resource.data.keys().hasAll(['email', 'displayName']) &&
  request.resource.data.email == request.auth.token.email;
```

## **Improved Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && request.auth.token.email == "meeran01110rafiq@gmail.com";
    }
    
    function isValidUser(userData) {
      return userData.keys().hasAll(['email', 'displayName']) &&
             userData.email == request.auth.token.email &&
             userData.displayName is string &&
             userData.displayName.size() > 0;
    }
    
    function isValidArticle(articleData) {
      return articleData.keys().hasAll(['title', 'content', 'authorUid']) &&
             articleData.title is string &&
             articleData.title.size() > 0 &&
             articleData.content is string &&
             articleData.content.size() > 0 &&
             articleData.authorUid == request.auth.uid;
    }

    // 1. USERS: Enhanced validation
    match /users/{userId} {
      allow read: if true; // Public profiles
      allow create: if isAuthenticated() && 
        request.auth.uid == userId &&
        isValidUser(request.resource.data);
      allow update: if isOwner(userId) && 
        isValidUser(request.resource.data) || isAdmin();
      allow delete: if isOwner(userId) || isAdmin();
    }

    // 2. ARTICLES: Enhanced validation
    match /articles/{articleId} {
      allow read: if true;
      allow create: if isAuthenticated() && isValidArticle(request.resource.data);
      
      // Optimized update logic
      allow update: if isAuthenticated() && (
        // Only updating views (no validation needed)
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views']) ||
        // Author updating (with validation)
        (resource.data.authorUid == request.auth.uid && isValidArticle(request.resource.data)) ||
        // Admin updating
        isAdmin()
      );
      
      allow delete: if isAuthenticated() && 
        (resource.data.authorUid == request.auth.uid || isAdmin());
    }

    // 3. SUBSCRIBERS: Same as before
    match /subscribers/{docId} {
      allow create: if true;
      allow read, delete: if isAdmin();
    }

    // 4. CHATS: Improved performance
    match /chats/{chatId} {
      allow create: if isAuthenticated() &&
        request.resource.data.participants.hasAny([request.auth.uid]);
      
      allow read, update: if isAuthenticated() && 
        resource.data.participants.hasAny([request.auth.uid]);
      
      allow delete: if isAuthenticated() && 
        (resource.data.participants.hasAny([request.auth.uid]) || isAdmin());

      // MESSAGES subcollection
      match /messages/{messageId} {
        allow read, create: if isAuthenticated() && 
          get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
        
        allow update, delete: if isAuthenticated() && 
          (resource.data.senderId == request.auth.uid || isAdmin());
      }

      // TYPING indicators
      match /typing/{typingId} {
        allow read, write: if isAuthenticated() && 
          get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
      }
    }

    // 5. CONTACTS: Same as before
    match /contacts/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }

    // 6. USER_CHATS: Same as before  
    match /user_chats/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }

    // 7. LIKES: Enhanced
    match /articles/{articleId}/likes/{userId} {
      allow read: if true;
      allow create, delete: if isAuthenticated() && request.auth.uid == userId;
      allow update: if false; // Likes shouldn't be updated, only created/deleted
    }

    // 8. COMMENTS: Enhanced validation
    match /articles/{articleId}/comments/{commentId} {
      allow read: if true;
      allow create: if isAuthenticated() &&
        request.resource.data.keys().hasAll(['userId', 'content', 'timestamp']) &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.content is string &&
        request.resource.data.content.size() > 0;
      
      allow update, delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }

    // 9. NEW: NOTIFICATIONS (if you add them)
    match /notifications/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }

    // 10. NEW: USER SETTINGS
    match /settings/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
  }
}
```

## **Key Improvements:**

1. **Data Validation**: Proper field validation for users, articles, comments
2. **Performance**: Reduced get() calls where possible
3. **Security**: Stricter validation rules
4. **Consistency**: Better error handling
5. **Future-proof**: Added notifications and settings rules

## **Recommendation:**
Your current rules are functional but use the improved version for better security and performance.