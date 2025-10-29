const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const DOMPurify = require('dompurify');
const jsdomLib = require('jsdom');

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
let users = [
    { username: "Admin", bio: "<b>Welcome to Bloggerish!</b> This is the admin account." },
];
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
let nextPostId = 2;
let nextCommentId = 2;

// Helper sanitization: allow minimal safe tags (b, i, em, strong, a, br, ul, ol, li, p)
function sanitizeRichText(input) {
    return input
        .replace(/<(?!\/?(b|i|em|strong|a|br|ul|ol|li|p)( |\/>|>))/gi, "&lt;")
        .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, ""); // Remove javascript handlers
}

function getUserByUsername(username) {
    return users.find((u) => u.username === username);
}
function ensureUserExists(username) {
    let user = getUserByUsername(username);
    if (!user) {
        user = { username: username, bio: "" };
        users.push(user);
    }
    return user;
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
        const author = getUserByUsername(post.author) || { username: post.author, bio: "" };
        postsHTML += `
            <div class="post">
                <h2><a href="/post/${post.id}">${post.title}</a></h2>
                <div class="post-meta">By <a href="/profile/${author.username}">${author.username}</a> on ${new Date(post.timestamp).toLocaleDateString()}</div>
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
    const author = getUserByUsername(post.author) || { username: post.author, bio: "" };

    let commentsHTML = '';
    post.comments.forEach(comment => {
        // Render comment HTML
        commentsHTML += `
            <div class="comment">
                <div class="comment-author">${comment.author}</div>
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
                <div class="post-meta">By <a href="/profile/${author.username}">${author.username}</a> on ${new Date(post.timestamp).toLocaleDateString()}</div>
                <div class="author-bio-block"><strong>Bio:</strong><br>${sanitizeRichText(author.bio)}</div>
                <div class="post-content">${post.content}</div>
            </article>
            
            <section class="comments-section">
                <h3>Comments (${post.comments.length})</h3>
                <div class="comments">
                    ${commentsHTML}
                </div>
                
                <form class="comment-form" action="/post/${post.id}/comment" method="POST">
                    <h4>Add a Comment</h4>
                    <input type="text" name="author" placeholder="Your name should be entered here" required>
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

// Profile viewing
app.get('/profile/:username', (req, res) => {
    const username = req.params.username;
    const user = getUserByUsername(username);
    if (!user) return res.status(404).send('<h1>User not found</h1>');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${user.username}'s Profile - Bloggerish</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> |
            <a href="/edit-profile/${user.username}">Edit Profile</a> |
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>${user.username}</h2>
            <div class="author-bio-block"><strong>Bio:</strong><br>${sanitizeRichText(user.bio) || '<i>No bio set.</i>'}</div>
            <a class="edit-profile-link" href="/edit-profile/${user.username}">Edit Bio</a>
        </div>
    </main>
</body>
</html>
    `;
    res.send(html);
});

// Profile edit form
app.get('/edit-profile/:username', (req, res) => {
    const username = req.params.username;
    const user = getUserByUsername(username);
    if (!user) return res.status(404).send('<h1>User not found</h1>');
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Profile - ${sanitizeServerSideContent(user.username)}</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <div class="logo">
            <a href="/"><img src="/logo.jpg" alt="Bloggerish"></a>
        </div>
        <nav>
            <a href="/">Home</a> |
            <a href="/profile/${user.username}">View Profile</a> |
            <a href="/new-post">New Post</a>
        </nav>
    </header>
    <main>
        <div class="container">
            <h2>Edit Bio for ${user.username}</h2>
            <form class="bio-form" action="/edit-profile/${user.username}" method="POST">
                <label for="bio">Bio (rich text allowed: b, i, em, strong, a, br, ul, ol, li, p):</label><br>
                <textarea id="bio" name="bio" style="min-height:120px;width:100%;">${user.bio.replace(/</g, "&lt;")}</textarea><br>
                <button type="submit">Save Bio</button>
            </form>
        </div>
    </main>
</body>
</html>
    `;
    res.send(html);
});

app.post('/edit-profile/:username', (req, res) => {
    const username = req.params.username;
    const user = getUserByUsername(username);
    if (!user) return res.status(404).send('<h1>User not found</h1>');
    let newBio = req.body.bio || "";
    user.bio = newBio; // Will sanitize when displaying
    res.redirect(`/profile/${user.username}`);
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
    ensureUserExists(author);
    
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
    ensureUserExists(author);
    
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
                <input type="text" name="q" value="${query}" placeholder="Search posts...">
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

app.listen(PORT, () => {
    console.log(`🗒️  Bloggerish server running on http://localhost:${PORT}`);
    console.log('Welcome to Bloggerish - Share your thoughts with the world!');
});
