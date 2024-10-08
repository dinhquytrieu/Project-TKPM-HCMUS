// app.js
// A web application framework for Node.js, designed for building web applications and APIs.
const express = require("express");
const http = require('http');
const hbs = require("express-handlebars");
const path = require("path");
// Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
const methodOverride = require("method-override");
// Automatically refreshes the page when files change.
const livereload = require("livereload");
// Middleware to enable live reloading in the browser.
const connectLiveReload = require("connect-livereload");
// Middleware for parsing incoming request bodies in a middleware before your handlers, available under the req.body property.
const bodyParser = require("body-parser");
const route = require("../routes/index.route");
// Setup to store session data. It uses Redis as a session store to save session data on the server side.
const session = require("express-session");
// Used to store messages during a session, typically used to inform users about success or error events.
const flash = require("connect-flash");
// Middleware for handling user authentication.
const passport = require("../middleware/passport");
const redisStore = require("connect-redis").default;
// A fast, open-source, in-memory key-value data store for use as a database, cache, message broker, and queue.
const { createClient } = require("redis");
// const redisClient = createClient({
//   url: "redis://redis-16889.c299.asia-northeast1-1.gce.redns.redis-cloud.com:16889",
//   username: 'default',
//   password: 'qexkipbn3hm1Ef12PSfuOaFUU2cirJyy'
// });

const redisClient = createClient({
  url: "redis://redis-12075.c74.us-east-1-4.ec2.redns.redis-cloud.com:12075",
  username: 'default',
  password: 'NMuHy582tCV5OgHvjTZDOq1t19VeiTsf'
});

redisClient.connect().catch(console.error);

const liveReloadServer = livereload.createServer();
const app = express();
// socket.io
const server = http.createServer(app);

// Livereload for automatically refresh browser
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

app.use(express.static(path.join(__dirname, "public")));
app.use(connectLiveReload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));

// Template engines handlebars
app.engine(
  "hbs",
  hbs.engine({
    extname: ".hbs",
    helpers: require("../helpers/handlebars"),
  })
);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "resources/views"));

// socket.io
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình sử dụng express session
app.use(
  session({
    secret: "S3cret",
    store: new redisStore({
      client: redisClient,
      ttl: 60 * 60 * 6, // Redis sẽ tự dedete session sau 6 tiếng
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 20 * 60 * 1000, // Cookie của người dùng sẽ tự expire sau 20 phút
    },
  })
);

// Cấu hình sử dụng passport cho việc authentication
app.use(passport.initialize());
app.use(passport.session());

// Cấu hình sử dụng flash cho các thông báo đến người dùng
app.use(flash());

// Middleware khởi tạo các thông tin cần thiết cho người dùng như trạng thái đăng nhập, giỏ hàng, ...
app.use((req, res, next) => {
  // Check coi người dùng đăng nhập hay chưa, lưu trạng thái vào isLoggedIn
  res.locals.isLoggedIn = req.isAuthenticated();
  // Khởi tạo giỏ hàng
  if (!req.session.cart) {
    req.session.cart = [];
    res.locals._cartNumber = 0;
  }
  if (!res.locals._cartNumber) {
    res.locals._cartNumber = req.session.cart.length;
  }
  if (res.locals.isLoggedIn) {
    res.locals._id = req.user._id;
    res.locals._firstName = req.user.firstName;
    require("../middleware/cartInit")(req, res, next);
    res.locals._cartNumber = req.session.cart.length;
    if (!req.session.readAnnounce) {
      req.session.readAnnounce = req.user.readAnnounce;
    }
  }
  next();
});

// ROUTES INIT
route(app);

module.exports = { app, server };
