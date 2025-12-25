---
description: Phase 3 - Advanced Features & Logic Completion
---

# Phase 3: Advanced Features & Logic Completion

This phase focuses on fully implementing the complex features that were previously just skeletal UI or partial logic, specifically Group Chats, User Settings, and refinements to the Signaling/Call system.

## Steps

1.  **Settings Sync**
    - [ ] **Profile Settings**: Ensure `profile-social.js` correctly saves Privacy (Last Seen, Photo, About) to the backend.
    - [ ] **Chat Settings**: Wire up the "Chat Wallpaper" and "Enter is send" toggles in `chat.html` (via `whatsapp-chat.js`) to `localStorage` or User Preference API.

2.  **Group Chat Implementation**
    - [ ] **Create Group UI**: Wire up the "New Group" modal in `chat.html`.
    - [ ] **Backend Endpoint**: Ensure `/api/chat/groups/create` handles group creation with multiple participants.
    - [ ] **Frontend Logic**: Update `whatsapp-chat.js` to handle selecting multiple users and sending the create request.

3.  **Notifications & Unread Counts**
    - [ ] **Unread Logic**: Verify `unreadCounts` are updated in real-time on `chat.html`.
    - [ ] **Mark Read**: Ensure opening a chat emits `mark_messages_read` and clears the badge.

4.  **WebRTC Refinements**
    - [ ] **Call UI**: Polish the "Incoming Call" overlay (ensure it appears over other content).
    - [ ] **Signaling**: Verify `call_user` / `answer_call` flow handles errors (e.g., user offline).
    - [ ] **Ringtone**: Add a simple audio feedback for incoming calls.

5.  **Search & Exploration**
    - [ ] **Global Search**: Implement valid search logic in `index.html` (or `explore.html` if created) to find users or posts.
