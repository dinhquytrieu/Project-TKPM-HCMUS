const express = require("express");
const http = require('http');
// const socketIo = require('socket.io');
const hbs = require("express-handlebars");
const path = require("path");
const methodOverride = require("method-override");
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const bodyParser = require("body-parser");
const route = require("../routes/index.route");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("../middleware/passport");
const redisStore = require("connect-redis").default;
const { createClient } = require("redis");
const redisClient = createClient({
  url: "redis://redis-16889.c299.asia-northeast1-1.gce.redns.redis-cloud.com:16889",
  username: 'default',
  password: 'qexkipbn3hm1Ef12PSfuOaFUU2cirJyy'
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
  // Check if the user is logged in and store the state in isLoggedIn
  res.locals.isLoggedIn = req.isAuthenticated();

  // Initialize the cart if it does not exist in the session
  if (!req.session.cart) {
    req.session.cart = [];
    res.locals._cartNumber = 0;  // Number of unique items in the cart is zero if cart is empty
  }

  // If res.locals._cartNumber is not initialized, calculate the number of unique items in the session cart
  if (!res.locals._cartNumber) {
    res.locals._cartNumber = req.session.cart.length;  // Number of unique products in the session cart
  }

  // Additional settings and initializations if the user is logged in
  if (res.locals.isLoggedIn) {
    res.locals._id = req.user._id;
    res.locals._firstName = req.user.firstName;
    
    // Initialize the cart from user's stored cart information
    require("../middleware/cartInit")(req, res, async () => {
      // Update _cartNumber based on the user's cart from the database after initialization
      if (req.user && req.user.cart) {
        res.locals._cartNumber = req.user.cart.length;  // Number of unique products in the user's cart
      }
      
      // Check if announcements have been read, synchronize session with user's state
      if (!req.session.readAnnounce && req.user.readAnnounce) {
        req.session.readAnnounce = req.user.readAnnounce;
      }

      next();  // Proceed to the next middleware
    });
  } else {
    next();  // If not logged in, just continue to the next middleware
  }
});

// ROUTES INIT
route(app);

module.exports = { app, server};
