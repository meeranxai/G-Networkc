---
description: Phase 2 - PWA Implementation & Offline Experience
---

# Phase 2: PWA & Offline Experience

This phase focuses on transforming G-Network into a robust Progressive Web App (PWA) with offline capabilities and a native-like feel.

## Steps

1.  **Create Offline Fallback Page**
    - [ ] Create `offline.html` with a user-friendly "You are offline" message and a "Retry" button.
    - [ ] Ensure it shares the same basic styling (`style.css`) but is standalone.

2.  **Update Manifest**
    - [ ] Refine `manifest.json` with `scope`, `shortcuts`, and verify icon paths.

3.  **Enhance Service Worker**
    - [ ] Update `service-worker.js` to cache the new `offline.html`.
    - [ ] Update `ASSETS_TO_CACHE` to include all new JS modules (`config.js`, `notifications.js`, etc.) and `components.css`.
    - [ ] Update the `fetch` handler to return `offline.html` for navigation requests when offline.

4.  **Install UI**
    - [ ] Add an "Install App" button to the `index.html` sidebar (and `profile.html`).
    - [ ] Implement `js/pwa-install.js` to handle the `beforeinstallprompt` event and show/hide the button.

5.  **Validation**
    - [ ] Verify Lighthouse PWA score (if possible, or manual verification).
    - [ ] Verify offline behavior by toggling network.
