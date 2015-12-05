﻿var express = require('express');
var router = express.Router();
var session = require('express-session');
var bodyParser = require('body-parser');
var request = require('request');

var sessionSecret = 'REPLACE THIS WITH YOUR OWN SECRET, IT CAN BE ANY STRING';

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
router.use(session({ secret: sessionSecret, resave: false, saveUninitialized: true }));

/* PUBLIC ROUTES
---------------------------------*/

// login
router.get('/login', function (req, res) {
    // log user out
    delete req.session.token;

    // move success message into local variable so it only appears once (single read)
    var viewData = { success: req.session.success };
    delete req.session.success;

    res.render(__dirname + '/public/login.ejs', viewData);
});

router.post('/login', function (req, res) {
    request.post({
        url: apiUrl(req) + '/authenticate',
        form: req.body,
        json: true
    }, function (error, response, body) {
        if (error) {
            return res.render(__dirname + '/public/login.ejs', { error: 'An error occurred' });
        }

        if (!body.token) {
            return res.render(__dirname + '/public/login.ejs', { error: 'Username or password is incorrect', username: req.body.username });
        }

        // save JWT token in the session to make it available to the angular app
        req.session.token = body.token;

        // redirect to returnUrl
        var returnUrl = req.query.returnUrl && decodeURIComponent(req.query.returnUrl) || '/';
        res.redirect(returnUrl);
    });
});

// register
router.get('/register', function (req, res) {
    res.render(__dirname + '/public/register.ejs');
});

router.post('/register', function (req, res) {
    request.post({
        url: apiUrl(req) + '/users/register',
        form: req.body,
        json: true
    }, function (error, response, body) {
        if (error) {
            return res.render(__dirname + '/public/register.ejs', { error: 'An error occurred' });
        }

        if (response.statusCode !== 200) {
            return res.render(__dirname + '/public/register.ejs', {
                error: response.body,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                username: req.body.username
            });
        }

        // return to login page with success message
        req.session.success = 'Registration successful';
        return res.redirect('/login');
    });
});


/* APP ROUTES
---------------------------------*/
router.use('/app', function (req, res, next) {
    // use session auth to secure the angular app files
    if (req.path !== '/login' && !req.session.token) {
        return res.redirect('/login?returnUrl=' + encodeURIComponent('/app' + req.path));
    }

    next();
});

// make JWT token available to angular app
router.get('/app/token', function (req, res) {
    res.send(req.session.token);
});

// serve app files from the '/app' route
router.use('/app', express.static('app'));

// make the '/app' route the default path
router.get('/', function (req, res) {
    return res.redirect('/app');
});


/* HELPER FUNCTIONS
---------------------------------*/
function apiUrl(req) {
    return req.protocol + '://' + req.get('host') + '/api';
}


module.exports = router;