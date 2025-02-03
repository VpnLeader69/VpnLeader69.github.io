const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session'); // Import express-session

const app = express();
const PORT = 5500;

// Database setup
const db = new sqlite3.Database('users.db');

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'Thefitnessgrampacertest1179', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT
)`);

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        const currentTime = Date.now();
        const lastActivity = req.session.lastActivity || currentTime;

        // 15 minutes inactivity timeout
        if (currentTime - lastActivity > 15 * 60 * 1000) {
            req.session.destroy(); // Destroy the session
            return res.redirect('/login'); // Redirect to login
        }

        // Update last activity time
        req.session.lastActivity = currentTime;
        return next();
    } else {
        res.redirect('/login');
    }
}

// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/create_account', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create_account.html'));
});

app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/store', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'store.html'));
});

app.get('/support', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

// Handle account creation
app.post('/create_account', (req, res) => {
    const { username, email, password } = req.body;

    // Check if the email already exists
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
        if (err) {
            return res.status(400).send('Database error: ' + err.message);
        }
        if (row) {
            return res.status(400).send('Email already in use.'); // Handle duplicate email
        }

        // Proceed with the insert if email is unique
        const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.run(query, [username, email, password], function (err) {
            if (err) {
                return res.status(400).send('Error creating account: ' + err.message);
            }
            res.redirect('/'); // Redirect to login page after successful account creation
        });
    });
});

// Handle login (assuming you have this implemented)
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate user credentials
    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).send('Internal Server Error');
        }
        if (!row) {
            console.log('Login failed: Invalid credentials for', email);
            return res.status(401).send('Invalid credentials');
        }

        // Set user ID in session after successful login
        req.session.userId = row.id;
        console.log('Login successful for user ID:', row.id);

        // Redirect to home page after successful login
        res.redirect('/home'); // Ensure /home route is protected
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login'); // Redirect after logout
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
