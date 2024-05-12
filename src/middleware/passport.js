// Local strategies for login and registration
// Passport là một middleware xác thực rất phổ biến dành cho Node.js. 
// Nó được sử dụng để xác thực các yêu cầu, và bởi vì nó được thiết kế để phục vụ một lượng lớn các chiến lược xác thực 
// thông qua các mô-đun plugin, Passport có thể dễ dàng tích hợp vào bất kỳ ứng dụng web Node.js nào.

const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const Account = require("../models/account.model");

// Passport có thể sử dụng session HTTP để lưu trữ ID của người dùng đã đăng nhập. 
// Khi người dùng truy cập lại ứng dụng, thông tin này có thể được sử dụng để tái tạo đối tượng người dùng mà không cần họ phải đăng nhập lại.
// Quá trình này được xử lý thông qua hai hàm chính là passport.serializeUser() và passport.deserializeUser(). 
// Hàm đầu tiên lưu trữ thông tin cần thiết vào session, và hàm thứ hai lấy thông tin đó để xây dựng lại đối tượng người dùng từ CSDL.

// Hàm được gọi khi xác thực thành công và lưu thông tin người dùng vào session
// "Session" là một cách để lưu trữ thông tin về người dùng trên máy chủ trong suốt thời gian của một phiên làm việc
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Hàm được gọi bởi passport.session để lấy thông tin người dùng từ DB ứng với id được lưu trong session và lưu vào req.user
passport.deserializeUser(async (id, done) => {
  try {
    let user = await Account.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Hàm xác thực người dùng khi đăng nhập
passport.use(
  "local-login",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true, // Cho phép truyền req vào trong call back
    },
    async (req, email, password, done) => {
      if (email) {
        email = email.toLowerCase();
      }
      try {
        if (!req.user) {
          // Người dùng chưa đăng nhập
          let user = await Account.findOne({ email: email }).exec();
          // Email chưa tồn tại
          if (!user) {
            return done(
              null,
              false,
              req.flash("loginMessage", "Email does not exist!")
            );
          }
          // Sai mật khẩu
          if (!bcrypt.compareSync(password, user.password)) {
            return done(
              null,
              false,
              req.flash("loginMessage", "Invalid password !")
            );
          }
          // Người dùng bị ban bởi admin
          if (user.accountStatus == "Banned") {
            return done(
              null,
              false,
              req.flash(
                "loginMessage",
                "You have been banned by Admin of StudentShop. Please contact to twohandbookse@gmail.com for further information."
              )
            );
          }
          // Đăng nhập thành công
          return done(null, user);
        }
        // Bỏ qua việc đăng nhập
        return done(null, req.user);
      } catch (error) {
        console.log("Something goes wrong in sign in!!");
        return done(error);
      }
    }
  )
);

// Hàm đăng kí tài khoản
passport.use(
  "local-register",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      if (email) {
        email = email.toLowerCase();
      }
      if (req.user) {
        // Nếu người dùng đã đăng nhập, bỏ qua
        return done(null, req.user);
      }
      try {
        let user = await Account.findOne({ email: email }).exec();
        if (user) {
          // Nếu email đã tồn tại
          return done(
            null,
            false,
            req.flash("registerMessage", "Email is already taken!")
          );
        }
        let formData = req.body;
        // Hash mật khẩu và lưu thông tin user vào database
        formData.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8));
        user = await Account(formData);
        user.save();
        // Thông báo user đăng kí tài khoản thành công
        done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport;
