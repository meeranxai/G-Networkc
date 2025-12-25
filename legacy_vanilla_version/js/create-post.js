import CONFIG from './config.js';

const API_URL = `${CONFIG.API_BASE_URL}/api/posts`;

document.addEventListener("DOMContentLoaded", () => {
    // Elements - Inline Composer
    const composer = document.getElementById("inline-composer");
    const textarea = document.getElementById("composer-text");
    const postBtn = document.getElementById("inline-post-btn");
    const fileInput = document.getElementById("inline-file-input");
    const uploadBtn = document.getElementById("inline-upload-btn");
    const previewArea = document.getElementById("inline-preview");
    const previewImg = document.getElementById("inline-img");
    const removeImgBtn = document.getElementById("remove-inline-img");

    let selectedFile = null;

    // 1. Textarea Auto-Expand & Button Visibility
    textarea.addEventListener("input", () => {
        // Auto-expand
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';

        validateComposer();
    });

    function validateComposer() {
        const hasText = textarea.value.trim().length > 0;
        const hasFile = !!selectedFile;

        if (hasText || hasFile) {
            postBtn.style.display = 'block';
            // Subtle fade in animation via class if needed, for now just block
        } else {
            postBtn.style.display = 'none';
        }
    }

    // 2. Image Upload Handling
    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewArea.style.display = 'block';
                validateComposer();
            };
            reader.readAsDataURL(selectedFile);
        }
    });

    removeImgBtn.addEventListener("click", () => {
        selectedFile = null;
        fileInput.value = "";
        previewArea.style.display = 'none';
        previewImg.src = "";
        validateComposer();
    });

    // 3. Hashtag Extraction Logic
    function extractHashtags(text) {
        const regex = /#(\w+)/g;
        const matches = text.match(regex);
        return matches ? matches.map(match => match.toLowerCase().replace('#', '')) : [];
    }

    // 4. Submit Logic
    postBtn.addEventListener("click", async () => {
        const text = textarea.value.trim();
        if (!text && !selectedFile) return;

        // Disable UI
        postBtn.disabled = true;
        postBtn.textContent = "Posting...";

        try {
            const currentUser = firebase.auth().currentUser;
            const authorName = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : 'Tech User';

            const hashtags = extractHashtags(text);

            const formData = new FormData();
            formData.append('description', text);
            if (selectedFile) {
                formData.append('image', selectedFile);
            }
            formData.append('author', authorName);
            formData.append('authorId', currentUser ? currentUser.uid : '');
            formData.append('authorAvatar', currentUser ? currentUser.photoURL : '');
            formData.append('hashtags', JSON.stringify(hashtags)); // Send as JSON string

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Server Error");

            // Success - Reset
            textarea.value = "";
            textarea.style.height = 'auto';
            selectedFile = null;
            fileInput.value = "";
            previewArea.style.display = 'none';
            validateComposer();

            // Reload feed & trends
            if (window.loadFeed) window.loadFeed();
            if (window.loadTrendingTags) window.loadTrendingTags();

        } catch (error) {
            console.error("Upload Error:", error);
            alert("Failed to post: " + error.message);
        } finally {
            postBtn.disabled = false;
            postBtn.textContent = "Post";
        }
    });
});
