// Import the necessary Firebase modules from a free CDN
import { initializeApp } from "https://gstatic.com";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://gstatic.com";
import { getDatabase, ref, set, push, onValue, update } from "https://gstatic.com";

// Your custom Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcwSy65AdFqgHDeKjw4xTTnvGdFQA9i6Y",
  authDomain: "flexbook-app-7c43c.firebaseapp.com",
  databaseURL: "https://flexbook-app-7c43c-default-rtdb.firebaseio.com",
  projectId: "flexbook-app-7c43c",
  storageBucket: "flexbook-app-7c43c.firebasestorage.app",
  messagingSenderId: "748070005411",
  appId: "1:748070005411:web:9d4082abb2886ebad8ed16"
};

// Initialize services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');
const postInput = document.getElementById('post-input');
const btnSharePost = document.getElementById('btn-share-post');
const postsFeed = document.getElementById('posts-feed');
const userAvatar = document.getElementById('user-avatar');

let currentUser = null;

// --- 1. AUTHENTICATION LOGIC ---

// Monitor user login state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        userAvatar.innerText = user.email.charAt(0).toUpperCase();
        loadPosts();
    } else {
        currentUser = null;
        appScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
    }
});

// Handle Login Button Click
btnLogin.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return alert("Fill in all fields!");
    
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => alert(error.message));
});

// Handle Sign Up Button Click
btnSignup.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return alert("Fill in all fields!");
    
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Account created successfully!");
        })
        .catch(error => alert(error.message));
});

// Handle Logout Button Click
btnLogout.addEventListener('click', () => {
    signOut(auth).catch(error => alert(error.message));
});


// --- 2. POSTING & FEED LOGIC ---

// Show the post submit button when typing
postInput.addEventListener('input', () => {
    if(postInput.value.trim() !== "") {
        btnSharePost.classList.remove('hidden');
    } else {
        btnSharePost.classList.add('hidden');
    }
});

// Create a new post
btnSharePost.addEventListener('click', () => {
    const text = postInput.value.trim();
    if(!text || !currentUser) return;

    const postsRef = ref(db, 'posts');
    const newPostRef = push(postsRef);
    
    set(newPostRef, {
        author: currentUser.email,
        content: text,
        timestamp: Date.now(),
        likesCount: 0,
        sharesCount: 0
    }).then(() => {
        postInput.value = "";
        btnSharePost.classList.add('hidden');
    }).catch(err => alert(err.message));
});

// Load posts from database in real-time
function loadPosts() {
    const postsRef = ref(db, 'posts');
    onValue(postsRef, (snapshot) => {
        postsFeed.innerHTML = "";
        const data = snapshot.val();
        if (!data) {
            postsFeed.innerHTML = `<div class="text-center py-8 text-gray-500">No posts yet. Start the conversation!</div>`;
            return;
        }

        // Convert data object to an array and sort by latest timestamp
        const sortedPosts = Object.entries(data).reverse();

        sortedPosts.forEach(([postId, post]) => {
            const initial = post.author.charAt(0).toUpperCase();
            
            // Build comments HTML string
            let commentsHtml = "";
            if (post.comments) {
                Object.values(post.comments).forEach(comment => {
                    commentsHtml += `
                        <div class="bg-gray-100 p-2 rounded-lg text-sm">
                            <span class="font-bold text-gray-800">${comment.author.split('@')[0]}:</span>
                            <span class="text-gray-700">${comment.text}</span>
                        </div>
                    `;
                });
            }

            const postElement = document.createElement('div');
            postElement.className = "bg-white p-4 rounded-xl shadow-sm space-y-3";
            postElement.innerHTML = `
                <!-- Post Header -->
                <div class="flex items-center space-x-2">
                    <div class="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">${initial}</div>
                    <div>
                        <h4 class="font-semibold text-sm">${post.author.split('@')[0]}</h4>
                        <span class="text-xs text-gray-400">${new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                
                <!-- Post Body -->
                <p class="text-gray-800 text-sm whitespace-pre-wrap">${post.content}</p>
                
                <!-- Action Counters -->
                <div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span>👍 ${post.likesCount || 0} Likes</span>
                    <span>🔄 ${post.sharesCount || 0} Shares</span>
                </div>

                <!-- Interaction Buttons -->
                <div class="grid grid-cols-3 gap-1 text-center py-1 border-t border-b border-gray-100 text-sm font-semibold text-gray-600">
                    <button class="py-1 hover:bg-gray-50 rounded" onclick="window.likePost('${postId}', ${post.likesCount || 0})">👍 Like</button>
                    <button class="py-1 hover:bg-gray-50 rounded" onclick="document.getElementById('comment-box-${postId}').focus()">💬 Comment</button>
                    <button class="py-1 hover:bg-gray-50 rounded" onclick="window.sharePost('${postId}', '${post.content.replace(/'/g, "\\'")}', ${post.sharesCount || 0})">🔄 Share</button>
                </div>

                <!-- Comments Display -->
                <div class="space-y-2 max-h-40 overflow-y-auto pt-1">${commentsHtml}</div>

                <!-- Comment Input Box -->
                <div class="flex items-center space-x-2 pt-1">
                    <input type="text" id="comment-box-${postId}" placeholder="Write a comment..." 
                        class="w-full bg-gray-100 text-sm rounded-full py-1.5 px-3 focus:outline-none focus:bg-gray-200">
                    <button class="text-blue-600 text-sm font-bold px-2" onclick="window.addComment('${postId}')">Send</button>
                </div>
            `;
            postsFeed.appendChild(postElement);
        });
    });
}

// --- 3. LIKE, COMMENT, & SHARE INTERACTION HANDLERS ---

window.likePost = (postId, currentLikes) => {
    const postRef = ref(db, `posts/${postId}`);
    update(postRef, { likesCount: currentLikes + 1 });
};

window.addComment = (postId) => {
    const commentInput = document.getElementById(`comment-box-${postId}`);
    const commentText = commentInput.value.trim();
    if (!commentText || !currentUser) return;

    const commentsRef = ref(db, `posts/${postId}/comments`);
    const newCommentRef = push(commentsRef);

    set(newCommentRef, {
        author: currentUser.email,
        text: commentText,
        timestamp: Date.now()
    }).then(() => {
        commentInput.value = "";
    });
};

window.sharePost = (postId, originalContent, currentShares) => {
    if (!currentUser) return;
    
    // Update share counter on original post
    const postRef = ref(db, `posts/${postId}`);
    update(postRef, { sharesCount: currentShares + 1 });

    // Create a new post indicating it was shared
    const postsRef = ref(db, 'posts');
    const newPostRef = push(postsRef);
    
    set(newPostRef, {
        author: currentUser.email,
        content: `🔄 Shared a post:\n\n"${originalContent}"`,
        timestamp: Date.now(),
        likesCount: 0,
        sharesCount: 0
    }).then(() => {
        alert("Shared to your feed!");
    });
};
