const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Global sanitizer for server-side content
const globalWindow = new JSDOM('').window;
const globalPurify = createDOMPurify(globalWindow);

function sanitizeServerSideContent(content) {
    return globalPurify.sanitize(content);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory data storage
let posts = [
    {
        id: 1,
        title: "Welcome to Bloggerish!",
        content: "This is your first blog post. Feel free to add more posts and comments!",
        author: "Admin",
        timestamp: new Date().toISOString(),
        comments: [
            {
                id: 1,
                author: "Guest",
                content: "Great start! Looking forward to more posts.",
                timestamp: new Date().toISOString()
            }
        ]
    }
];

// User profiles storage
let userProfiles = {
    'Admin': {
        username: 'Admin',
        bio: '<p>Welcome to my blog! I\'m passionate about sharing knowledge and ideas with the world.</p>',
        createdAt: new Date().toISOString()
    },
    'Guest': {
        username: 'Guest',
        bio: '<p>Just a curious reader exploring the blogosphere.</p>',
        createdAt: new Date().toISOString()
    }
};

let nextPostId = 2;
let nextCommentId = 2;

// Helper function to sanitize HTML content
function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
    });
}

// Helper function to get or create user profile
function getUserProfile(username) {
    if (!userProfiles[username]) {
        userProfiles[username] = {
            username: username,
            bio: '<p>No bio yet.</p>',
            createdAt: new Date().toISOString()
        };
    }
    return userProfiles[username];
}

// Template rendering helper function
function renderHTML(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || '';
    });
}

// Home page - displays all posts
app.get('/', (req, res) => {
    let postsHTML = '';
    posts.forEach(post => {
        // Build post HTML
        postsHTML += `
            <div class="post">
                <h2><a href="/post/${post.id}">${post.title}</a></h2>
                <div class="post-meta">By <a href="/profile/${encodeURIComponent(post.author)}" class="author-link">${post.author}</a> on ${new Date(post.timestamp).toLocaleDateString()}</div>
                <div class="post-content">${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}</div>
                <div class="post-actions">
                    <a href="/post/${post.id}">Read More</a> | 
                    <span>${post.comments.length} comment(s)</span>
                </div>
            </div>
        `;
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bloggerish - Home</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            ${postsHTML}
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// View individual post
app.get('/post/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        return res.status(404).send('<h1>Post not found</h1>');
    }

    const authorProfile = getUserProfile(post.author);

    let commentsHTML = '';
    post.comments.forEach(comment => {
        // Render comment HTML
        commentsHTML += `
            <div class="comment">
                <div class="comment-author"><a href="/profile/${encodeURIComponent(comment.author)}">${comment.author}</a></div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-date">${new Date(comment.timestamp).toLocaleDateString()}</div>
            </div>
        `;
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <article class="post-full">
                <h1>${post.title}</h1>
                <div class="post-meta">By <a href="/profile/${encodeURIComponent(post.author)}" class="author-link">${post.author}</a> on ${new Date(post.timestamp).toLocaleDateString()}</div>
                
                <div class="author-bio-section">
                    <div class="author-bio-header">
                        <h3>About the Author</h3>
                        <a href="/profile/${encodeURIComponent(post.author)}">View Profile</a>
                    </div>
                    <div class="author-bio-content">${authorProfile.bio}</div>
                </div>
                
                <div class="post-content">${post.content}</div>
            </article>
            
            <section class="comments-section">
                <h3>Comments (${post.comments.length})</h3>
                <div class="comments">
                    ${commentsHTML}
                </div>
                
                <form class="comment-form" action="/post/${post.id}/comment" method="POST">
                    <h4>Add a Comment</h4>
                    <input type="text" name="author" placeholder="Your name" required>
                    <textarea name="content" placeholder="Your comment" required></textarea>
                    <button type="submit">Post Comment</button>
                </form>
            </section>
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// New post form
app.get('/new-post', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Post - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Create New Post</h2>
            <form class="post-form" action="/new-post" method="POST">
                <input type="text" name="title" placeholder="Post title" required>
                <input type="text" name="author" placeholder="Your name should be entered here" required>
                <textarea name="content" placeholder="Write your post here..." required></textarea>
                <button type="submit">Publish Post</button>
            </form>
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// Create new post and make sure it's fun
app.post('/new-post', (req, res) => {
    const { title, author, content } = req.body;
    
    // Create new post object
    const newPost = {
        id: nextPostId++,
        title: title,
        content: content,
        author: author,
        timestamp: new Date().toISOString(),
        comments: []
    };
    
    posts.unshift(newPost);
    res.redirect('/');
});

// Add comment to post
app.post('/post/:id/comment', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        return res.status(404).send('Post not found');
    }
    
    const { author, content } = req.body;
    
    // Create new comment object
    const newComment = {
        id: nextCommentId++,
        author: author,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    post.comments.push(newComment);
    res.redirect(`/post/${postId}`);
});

// Search functionality
app.get('/search', (req, res) => {
    const query = req.query.q || '';
    const results = posts.filter(post => 
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase())
    );

    let resultsHTML = '';
    if (query) {
        results.forEach(post => {
            resultsHTML += `
                <div class="post">
                    <h2><a href="/post/${post.id}">${post.title}</a></h2>
                    <div class="post-content">${post.content.substring(0, 200)}...</div>
                </div>
            `;
        });
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Search Posts</h2>
            <form action="/search" method="GET">
                <input type="text" name="q" value="${sanitizeServerSideContent(query)}" placeholder="Search posts...">
                <button type="submit">Search</button>
            </form>
            
            ${query ? `<h3>Results for "${sanitizeServerSideContent(query)}":</h3>` : ''}
            <div class="search-results">
                ${resultsHTML}
                ${query && results.length === 0 ? `<p>No posts found for "${sanitizeServerSideContent(query)}"</p>` : ''}
            </div>
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// View user profile
app.get('/profile/:username', (req, res) => {
    const username = decodeURIComponent(req.params.username);
    const profile = getUserProfile(username);
    
    // Get all posts by this user
    const userPosts = posts.filter(p => p.author === username);
    
    let userPostsHTML = '';
    userPosts.forEach(post => {
        userPostsHTML += `
            <div class="post">
                <h3><a href="/post/${post.id}">${post.title}</a></h3>
                <div class="post-meta">${new Date(post.timestamp).toLocaleDateString()}</div>
                <div class="post-content">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</div>
            </div>
        `;
    });
    
    if (userPosts.length === 0) {
        userPostsHTML = '<p class="no-posts">No posts yet.</p>';
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeServerSideContent(username)}'s Profile - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">${sanitizeServerSideContent(username.charAt(0).toUpperCase())}</div>
                    <div class="profile-info">
                        <h1>${sanitizeServerSideContent(username)}</h1>
                        <p class="profile-joined">Member since ${new Date(profile.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="profile-bio">
                    <h2>Bio</h2>
                    <div class="bio-content">${profile.bio}</div>
                    <a href="/profile/${encodeURIComponent(username)}/edit" class="edit-profile-btn">Edit Profile</a>
                </div>
                
                <div class="profile-posts">
                    <h2>Posts by ${username} (${userPosts.length})</h2>
                    ${userPostsHTML}
                </div>
            </div>
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// Edit profile form
app.get('/profile/:username/edit', (req, res) => {
    const username = decodeURIComponent(req.params.username);
    const profile = getUserProfile(username);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a> |
            <a href="/profile/${encodeURIComponent(username)}">Back to Profile</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <div class="profile-edit-form">
                <h2>Edit Profile - ${username}</h2>
                <form action="/profile/${encodeURIComponent(username)}/edit" method="POST" id="profileForm">
                    <div class="form-group">
                        <label for="bio">Bio (Rich Text)</label>
                        <div id="editor" style="height: 300px;"></div>
                        <input type="hidden" name="bio" id="bioInput">
                    </div>
                    <button type="submit">Save Profile</button>
                    <a href="/profile/${encodeURIComponent(username)}" class="cancel-btn">Cancel</a>
                </form>
            </div>
        </div>
    </main>
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script>
        // Initialize Quill editor
        var quill = new Quill('#editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    ['clean']
                ]
            }
        });
        
        // Set initial content
        var bioContent = ${JSON.stringify(profile.bio)};
        quill.root.innerHTML = bioContent;
        
        // Handle form submission
        document.getElementById('profileForm').addEventListener('submit', function(e) {
            // Get the HTML content from Quill
            var bioHTML = quill.root.innerHTML;
            document.getElementById('bioInput').value = bioHTML;
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
});

// Update profile
app.post('/profile/:username/edit', (req, res) => {
    const username = decodeURIComponent(req.params.username);
    const { bio } = req.body;
    
    // Sanitize the bio HTML
    const sanitizedBio = sanitizeHTML(bio);
    
    // Update or create profile
    userProfiles[username] = {
        username: username,
        bio: sanitizedBio,
        createdAt: userProfiles[username] ? userProfiles[username].createdAt : new Date().toISOString()
    };
    
    res.redirect(`/profile/${encodeURIComponent(username)}`);
});

app.listen(PORT, () => {
    console.log(`🗒️  Bloggerish server running on http://localhost:${PORT}`);
    console.log('Welcome to Bloggerish - Share your thoughts with the world!');
});
