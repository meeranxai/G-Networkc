# Professional Styling & Structure Guide

## Quick Reference for All Pages

### 🎨 Design System Variables

All pages use CSS variables from `style.css`:

```css
/* Colors */
--primary: #2563eb
--primary-dark: #1d4ed8
--primary-light: #60a5fa
--accent: #f59e0b
--error: #ef4444
--success: #10b981

/* Backgrounds */
--background-primary: #ffffff
--background-secondary: #fafafa
--background-elevated: #ffffff

/* Text */
--text-primary: #0f172a
--text-secondary: #475569
--text-tertiary: #94a3b8

/* Borders */
--border-light: #f3f4f6
--border-default: #e5e7eb
--border-medium: #d1d5db

/* Spacing */
--space-1: 0.25rem
--space-2: 0.5rem
--space-4: 1rem
--space-6: 1.5rem
--space-8: 2rem

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow-md: 0 4px 6px rgba(0,0,0,0.1)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1)

/* Border Radius */
--radius-sm: 6px
--radius-md: 12px
--radius-xl: 16px
```

---

## 📄 Page-Specific Styling

### Profile Page (`/profile`)

**Container:**
```jsx
<main className="feed-container">
  <div className="profile-container">
    {/* Content */}
  </div>
</main>
```

**Tabs:**
```jsx
<div className="profile-tabs">
  <button className={`tab-item ${activeTab === 'posts' ? 'active' : ''}`}>
    <i className="fas fa-th"></i> POSTS
  </button>
</div>
```

**Grid:**
```jsx
<div className="posts-grid">
  {posts.map(post => <ProfileGridItem key={post._id} post={post} />)}
</div>
```

**Responsive:**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

---

### Feed Page (`/`)

**Structure:**
```jsx
<main className="feed-container">
  <StoryBar />
  <CreatePost />
  <FeedStream />
</main>
```

**Features:**
- Infinite scroll
- Post cards with interactions
- Loading states
- Empty states

---

### Explore Page (`/explore`)

**Search Panel:**
```jsx
<div className="glass-panel">
  <form onSubmit={handleSearchSubmit}>
    <input className="form-input" placeholder="Search..." />
  </form>
</div>
```

**Results:**
```jsx
<div className="explore-grid">
  {posts.map(post => <PostCard key={post._id} post={post} />)}
</div>
```

**Features:**
- Search history dropdown
- Trending hashtags
- Tab filtering (top, posts, people)
- Infinite scroll

---

### Messages Page (`/messages`)

**Layout:**
```jsx
<div className="messenger-container">
  <div className="messenger-sidebar">
    {/* Chat list */}
  </div>
  <div className="messenger-main">
    {/* Chat area */}
  </div>
</div>
```

**Message Bubble:**
```jsx
<div className={`message ${isOwnMessage ? 'own' : 'other'}`}>
  <div className="message-content">
    <div className="message-text">{message.text}</div>
    <div className="message-meta">
      <span className="message-time">{formatTime(message.timestamp)}</span>
    </div>
  </div>
</div>
```

**Input Area:**
```jsx
<div className="messenger-input-area">
  <form className="message-input-form" onSubmit={handleSendMessage}>
    <button className="input-action-btn">
      <i className="fas fa-paperclip"></i>
    </button>
    <input className="message-input" placeholder="Type a message..." />
    <button className="send-btn" type="submit">
      <i className="fas fa-paper-plane"></i>
    </button>
  </form>
</div>
```

---

## 🎯 Common Components

### Card
```jsx
<div className="card">
  <div className="card-header">
    {/* Header content */}
  </div>
  {/* Body content */}
</div>
```

**Styling:**
- Background: `var(--background-elevated)`
- Border: `1px solid var(--border-light)`
- Border radius: `var(--radius-xl)`
- Shadow: `var(--shadow-sm)`

### Form Input
```jsx
<input className="form-input" placeholder="Enter text..." />
```

**States:**
- Default: Gray border, secondary background
- Focus: Blue border, elevated background, blue shadow
- Disabled: Reduced opacity

### Button
```jsx
<button className="send-btn">Send</button>
<button className="input-action-btn"><i className="fas fa-icon"></i></button>
```

**Variants:**
- `send-btn` - Primary action (gradient blue)
- `input-action-btn` - Secondary action (light gray)
- `icon-btn` - Icon only (circular)

### Loading State
```jsx
<div className="loading-spinner">
  <i className="fas fa-circle-notch fa-spin"></i>
</div>
```

### Empty State
```jsx
<div className="empty-state">
  <i className="fas fa-ghost"></i>
  <h3>No results found</h3>
  <p>Try searching for something else</p>
</div>
```

---

## 📱 Responsive Classes

### Visibility
```jsx
<div className="mobile-only">Mobile content</div>
<div className="desktop-only">Desktop content</div>
```

### Breakpoints
```css
/* Desktop: 1024px+ */
@media (max-width: 1024px) { }

/* Tablet: 768px */
@media (max-width: 768px) { }

/* Mobile: 480px */
@media (max-width: 480px) { }
```

---

## 🎬 Animations

### Message Slide In
```css
animation: messageSlideIn 0.3s ease;
```

### Fade In
```css
animation: fadeIn 0.3s ease;
```

### Scale In
```css
animation: scaleIn 0.3s ease;
```

### Pulse (Online Indicator)
```css
animation: pulse 2s infinite;
```

---

## ♿ Accessibility

### Keyboard Navigation
```css
button:focus-visible,
input:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

### Color Contrast
- Text on background: 4.5:1 minimum
- UI components: 3:1 minimum

---

## 🔧 Best Practices

### 1. Use CSS Variables
```jsx
// ✅ Good
style={{ color: 'var(--text-primary)' }}

// ❌ Avoid
style={{ color: '#0f172a' }}
```

### 2. Responsive Design
```jsx
// ✅ Good - Mobile first
<div className="posts-grid"> {/* 1 column by default */}

// ❌ Avoid - Desktop first
<div style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
```

### 3. Semantic HTML
```jsx
// ✅ Good
<main className="feed-container">
<article className="post-card">
<button className="send-btn">Send</button>

// ❌ Avoid
<div className="main">
<div className="post">
<div className="button">Send</div>
```

### 4. Consistent Spacing
```jsx
// ✅ Good
style={{ marginBottom: 'var(--space-6)' }}

// ❌ Avoid
style={{ marginBottom: '24px' }}
```

### 5. Proper Focus Management
```jsx
// ✅ Good
<input autoFocus={isOpen} />

// ❌ Avoid
<input />
```

---

## 🚀 Performance Tips

1. **Use CSS classes instead of inline styles**
   - Reduces re-renders
   - Better caching
   - Easier to maintain

2. **Lazy load images**
   ```jsx
   <img loading="lazy" src={url} alt="description" />
   ```

3. **Optimize animations**
   - Use `transform` and `opacity`
   - Avoid animating `width` and `height`

4. **Minimize reflows**
   - Batch DOM updates
   - Use CSS Grid/Flexbox

---

## 📚 File Organization

```
frontend/src/
├── styles/
│   ├── style.css (Design system)
│   ├── design-system.css (Extended tokens)
│   ├── components.css (Component styles)
│   ├── messenger.css (Chat styling)
│   ├── profile.css (Profile styling)
│   ├── pages-enhancement.css (Page enhancements)
│   └── ... (other styles)
├── pages/
│   ├── Home.jsx
│   ├── Profile.jsx
│   ├── Explore.jsx
│   ├── Messages.jsx
│   └── ...
├── components/
│   ├── feed/
│   ├── profile/
│   ├── layout/
│   ├── common/
│   └── ...
└── ...
```

---

## 🔗 CSS Import Chain

```javascript
// main.jsx
import './styles/style.css'              // Base system
import './styles/design-system.css'      // Extended tokens
import './styles/social.css'             // Social features
import './styles/components.css'         // Components
import './styles/app-integration.css'    // Integrations
import './styles/light-theme-force.css'  // Theme
import './styles/pages-enhancement.css'  // Page enhancements
```

**Order matters!** Later imports override earlier ones.

---

## 🎓 Learning Resources

- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [Media Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries)
- [Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated:** December 29, 2025
**Version:** 1.0
