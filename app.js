const express     = require('express');
const bodyParser  = require('body-parser');
const cookieParser= require('cookie-parser');
const session     = require('express-session');
const morgan      = require('morgan');
const routes      = require('./routes');

// invoke an instance of express application.
const app = express();

app.use('/static', express.static('public'));

app.set('view engine', 'pug');

// set our application port
app.set('port', 9000);

// set morgan to log info about our requests for development use.
app.use(morgan('dev'));

// initialize body-parser to parse incoming parameters requests to req.body
app.use(bodyParser.urlencoded({ extended: true }));

// initialize cookie-parser to allow us access the cookies stored in the browser. 
app.use(cookieParser());

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
    key:    'user_sid',
    secret: 'somerandonstuffs',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    },
    lasterror:''
}));

// This middleware will check if user's cookie is still saved in browser and user is not set, then automatically log the user out.
// This usually happens when you stop your express server after login, your cookie still remains saved in the browser.
app.use((req, res, next) => {
    if (req.cookies.user_sid && !req.session.user) {
        res.clearCookie('user_sid');
    }
    next();
});

app.use(routes);

// route for handling 404 requests(unavailable routes)
app.use(function (req, res, next) {
    res.status(404).send("Page not found (404)")
});

// start the express server
app.listen(app.get('port'), () => console.log(`App started on port ${app.get('port')}`));
