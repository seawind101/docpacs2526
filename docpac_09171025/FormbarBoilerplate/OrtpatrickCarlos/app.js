// Imports
require('dotenv').config();
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const session = require('express-session');
const { io } = require('socket.io-client');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);


//database setup
const db = new sqlite3.Database('./db/venture.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the database.');
    }
});

//Constants
const port = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_secret_key';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:420/oauth';
const THIS_URL = process.env.THIS_URL || `http://localhost:${port}`;
const API_KEY = process.env.API_KEY || 'your_api_key';

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
//app.use(express.json());
//app.use(express.urlencoded({ extended: true }));

app.use(session({
    store: new SQLiteStore({db : 'sessions.db', dir: './db'}),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

function isAuthenticated(req, res, next) {
    if (req.session.user) next();
    else res.redirect('/login');
};

// Routes
app.get('/', isAuthenticated, (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/login', (req, res) => {
    if (req.query.token) {
         let tokenData = jwt.decode(req.query.token);
         req.session.token = tokenData;
         req.session.user = tokenData.displayName;

        //save user to database if not exists
        db.run (`INSERT OR IGNORE INTO users (username) VALUES (?)`, [tokenData.displayName], function(err) {
            if (err) {
                return console.log(err.message);
            }
            console.log(`User ${tokenData.displayName} saved to database.`);
        });

         res.redirect('/');

    } else {
         res.redirect(`${AUTH_URL}/oauth?redirectURL=${THIS_URL}`);
    };
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/sendpogs' , isAuthenticated, (req, res) => {
    const data = {
        from: 112,
        to: 100,
        amount: 5,
        pin: 1775,
        reason: 'Test Pogs Transfer'
    }

    socket.emit('transferDigipogs', data);

    res.send('Pogs sent!');
});


// Socket.io client setup
const socket = io(AUTH_URL, {
    extraHeaders: {
        api: API_KEY
    }
});

socket.on('connect', () => {
    console.log('Connected to socket server');
    socket.emit('getActiveClass')
});

socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
});

socket.on('setClass', (classData) => {
    console.log('Recived class data:', classData);
    // Here you can implement logic to notify connected clients about the class update
});

//start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});