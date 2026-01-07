const DOMPurify = require('dompurify');
const jsdomLib = require('jsdom');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');


const globalWindow = new jsdomLib.JSDOM('').window;
const globalPurify = DOMPurify(globalWindow);

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
        sharedWith: [],
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

let nextPostId = 2;
let nextCommentId = 2;

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
                <h2><a href="/post/${post.id}">${sanitizeServerSideContent(post.title)}</a></h2>
                <div class="post-meta">By ${sanitizeServerSideContent(post.author)} on ${new Date(post.timestamp).toLocaleDateString()}</div>
                <div class="post-content">${sanitizeServerSideContent(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</div>
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
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
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

    let commentsHTML = '';
    post.comments.forEach(comment => {
        // Render comment HTML
        commentsHTML += `
            <div class="comment">
                <div class="comment-author">${sanitizeServerSideContent(comment.author)}</div>
                <div class="comment-content">${sanitizeServerSideContent(comment.content)}</div>
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
    <title>${sanitizeServerSideContent(post.title)} - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <article class="post-full">
                <h1>${sanitizeServerSideContent(post.title)}</h1>
                <div class="post-meta">By ${sanitizeServerSideContent(post.author)} on ${new Date(post.timestamp).toLocaleDateString()}</div>
                <div class="post-content">${sanitizeServerSideContent(post.content)}</div>
                <div class="post-actions">
                    <a href="/post/${post.id}/share" class="share-button">Share with Community</a>
                    ${post.sharedWith && post.sharedWith.length > 0 ? `<div class="shared-with">Shared with: ${sanitizeServerSideContent(post.sharedWith.join(', '))}</div>` : ''}
                </div>
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
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Create New Post</h2>
            <form class="post-form" action="/new-post" method="POST">
                <input type="text" name="title" placeholder="Post title" required>
                <input type="text" name="author" placeholder="Your name" required>
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

// Create new post
app.post('/new-post', (req, res) => {
    const { title, author, content } = req.body;
    
    // Create new post object
    const newPost = {
        id: nextPostId++,
        title: title,
        content: content,
        author: author,
        timestamp: new Date().toISOString(),
        sharedWith: [],
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
                    <h2><a href="/post/${post.id}">${sanitizeServerSideContent(post.title)}</a></h2>
                    <div class="post-content">${sanitizeServerSideContent(post.content.substring(0, 200))}...</div>
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
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Search Posts</h2>
            <form action="/search" method="GET">
                <input type="text" name="q" value="${sanitizeServerSideContent(query)}" placeholder="Search posts...">
                <button type="submit">Search</button>
            </form>
            
            ${sanitizeServerSideContent(query ? `<h3>Results for "${query}":</h3>` : '')}
            <div class="search-results">
                ${resultsHTML}
                ${sanitizeServerSideContent(query && results.length === 0 ? `<p>No posts found for "${query}"</p>` : '')}
            </div>
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// Community page - shows last 10 posts shared with community
app.get('/community', (req, res) => {
    // Filter posts that have been shared with community (sharedWith.length > 0)
    // Sort by timestamp (most recent first) and take last 10
    const communityPosts = posts
        .filter(post => post.sharedWith && post.sharedWith.length > 0)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

    let postsHTML = '';
    if (communityPosts.length === 0) {
        postsHTML = '<p class="no-posts">No community posts yet. Share a post to make it visible here!</p>';
    } else {
        communityPosts.forEach(post => {
            postsHTML += `
                <div class="post" data-post-id="${post.id}">
                    <div class="post-header">
                        <h2><a href="/post/${post.id}">${sanitizeServerSideContent(post.title)}</a></h2>
                        <button class="pin-button" data-post-id="${post.id}" aria-label="Pin post">
                            <span class="pin-icon">📌</span>
                            <span class="pin-text">Pin</span>
                        </button>
                    </div>
                    <div class="post-meta">By ${sanitizeServerSideContent(post.author)} on ${new Date(post.timestamp).toLocaleDateString()}</div>
                    <div class="post-content">${sanitizeServerSideContent(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</div>
                    <div class="post-actions">
                        <a href="/post/${post.id}">Read More</a> | 
                        <span>${post.comments.length} comment(s)</span>
                        ${post.sharedWith && post.sharedWith.length > 0 ? ` | <span>Shared with: ${sanitizeServerSideContent(post.sharedWith.join(', '))}</span>` : ''}
                    </div>
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
    <title>Community - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Community Posts</h2>
            <p class="community-description">Discover the latest posts shared by community members. Pin posts you want to read later!</p>
            <div id="pinned-posts-section" style="display: none;">
                <h3>📌 Pinned Posts</h3>
                <div id="pinned-posts-container"></div>
            </div>
            <h3>Recent Community Posts</h3>
            <div class="community-posts">
                ${postsHTML}
            </div>
        </div>
    </main>
    <script>
        // Load pinned posts from localStorage
        function loadPinnedPosts() {
            const pinnedIds = JSON.parse(localStorage.getItem('pinnedPosts') || '[]');
            const pinnedSection = document.getElementById('pinned-posts-section');
            const pinnedContainer = document.getElementById('pinned-posts-container');
            
            if (pinnedIds.length === 0) {
                pinnedSection.style.display = 'none';
                return;
            }
            
            pinnedSection.style.display = 'block';
            pinnedContainer.innerHTML = '';
            
            // Get all posts data from the page
            const allPosts = document.querySelectorAll('.community-posts .post[data-post-id]');
            const pinnedPosts = [];
            
            pinnedIds.forEach(id => {
                const postElement = Array.from(allPosts).find(p => parseInt(p.dataset.postId) === id);
                if (postElement) {
                    pinnedPosts.push(postElement.cloneNode(true));
                }
            });
            
            pinnedPosts.forEach(postEl => {
                postEl.classList.add('pinned');
                const pinButton = postEl.querySelector('.pin-button');
                if (pinButton) {
                    pinButton.classList.add('pinned');
                    pinButton.querySelector('.pin-text').textContent = 'Unpin';
                }
                pinnedContainer.appendChild(postEl);
            });
            
            updatePinButtons();
        }
        
        // Toggle pin status
        function togglePin(postId) {
            let pinnedIds = JSON.parse(localStorage.getItem('pinnedPosts') || '[]');
            const index = pinnedIds.indexOf(postId);
            
            if (index > -1) {
                pinnedIds.splice(index, 1);
            } else {
                pinnedIds.push(postId);
            }
            
            localStorage.setItem('pinnedPosts', JSON.stringify(pinnedIds));
            loadPinnedPosts();
            updatePinButtons();
        }
        
        // Update pin button states
        function updatePinButtons() {
            const pinnedIds = JSON.parse(localStorage.getItem('pinnedPosts') || '[]');
            const pinButtons = document.querySelectorAll('.pin-button');
            
            pinButtons.forEach(button => {
                const postId = parseInt(button.dataset.postId);
                if (pinnedIds.includes(postId)) {
                    button.classList.add('pinned');
                    button.querySelector('.pin-text').textContent = 'Unpin';
                } else {
                    button.classList.remove('pinned');
                    button.querySelector('.pin-text').textContent = 'Pin';
                }
            });
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Use event delegation for pin buttons
            document.addEventListener('click', function(e) {
                if (e.target.closest('.pin-button')) {
                    const button = e.target.closest('.pin-button');
                    const postId = parseInt(button.dataset.postId);
                    togglePin(postId);
                }
            });
            
            loadPinnedPosts();
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
});

// Share post form
app.get('/post/:id/share', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        return res.status(404).send('<h1>Post not found</h1>');
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Share Post - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> | 
            <a href="/new-post">New Post</a> | 
            <a href="/community">Community</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Share Post: ${sanitizeServerSideContent(post.title)}</h2>
            <div class="post-preview">
                <p><strong>Author:</strong> ${sanitizeServerSideContent(post.author)}</p>
                <p><strong>Content:</strong> ${sanitizeServerSideContent(post.content.substring(0, 150))}${post.content.length > 150 ? '...' : ''}</p>
            </div>
            <form class="share-form" action="/post/${post.id}/share" method="POST">
                <label for="members">Enter community member names (comma-separated):</label>
                <input type="text" name="members" id="members" placeholder="e.g., Alice, Bob, Charlie" required>
                <p class="form-help">Separate multiple names with commas</p>
                <div class="form-actions">
                    <button type="submit">Share Post</button>
                    <a href="/post/${post.id}" class="button-link">Cancel</a>
                </div>
            </form>
            ${post.sharedWith && post.sharedWith.length > 0 ? `
                <div class="current-sharing">
                    <h3>Currently shared with:</h3>
                    <ul>
                        ${post.sharedWith.map(member => `<li>${sanitizeServerSideContent(member)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    </main>
</body>
</html>
    `;
    
    res.send(html);
});

// Handle share post
app.post('/post/:id/share', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        return res.status(404).send('Post not found');
    }
    
    const { members } = req.body;
    
    if (!members || !members.trim()) {
        return res.status(400).send('Please provide at least one member name');
    }
    
    // Parse member names (split by comma, trim whitespace, filter empty strings)
    const memberNames = members.split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
    
    if (memberNames.length === 0) {
        return res.status(400).send('Please provide at least one valid member name');
    }
    
    // Initialize sharedWith if it doesn't exist
    if (!post.sharedWith) {
        post.sharedWith = [];
    }
    
    // Add new members (avoid duplicates)
    memberNames.forEach(member => {
        if (!post.sharedWith.includes(member)) {
            post.sharedWith.push(member);
        }
    });
    
    res.redirect(`/post/${postId}`);
});

app.listen(PORT, () => {
    console.log(`🗒️  Bloggerish server running on http://localhost:${PORT}`);
    console.log('Welcome to Bloggerish - Share your thoughts with the world!');
});
