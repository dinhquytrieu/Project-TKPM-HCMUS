const Product = require("../models/product.model");
const fs = require("fs");
const Evaluate = require("../models/evaluate.model");
const Account = require("../models/account.model");
const Order = require("../models/order.model");
const ProductRepository = require('../repositories/ProductRepository');

const path = require('path');

// const sequelize = require("sequelize");
// const Op = sequelize.Op;

const {
  mutipleMongooseToObject,
  mongooseToObject,
} = require("../utils/mongoose");
const { formatCurrency } = require("../helpers/handlebars");

// var allProducts;

class productController {
  // [GET] product/dashboard
  getDashboard = async (req, res, next) => {
    try {
      const options = { idAccount: req.user.id };
      let income = 0; //
      let order = 0; //
      let stock = 0; //
      let review = 0; //
      let sucOrder = 0; //
      let rating = 0;
      let sumRating = 0;
      let idProductForFindEval = [];
      let cate = [0, 0, 0, 0];
      // Tính toán *******************
      const orders = await Order.find({ idSeller: req.user.id });
      const productAll = await Product.find(options);
      order = orders.length;
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].status == "successful") {
          sucOrder += 1;
          for (const product of orders[i].detail) {
            const productInfo = await Product.findById(product.idProduct);
            income += productInfo.price * product.quantity;
          }
        }
      }
      for (const product of productAll) {
        stock += product.stock;
        if (product.category == "document") cate[0] += product.stock;
        else if (product.category == "uniform") cate[1] += product.stock;
        else if (product.category == "stationery") cate[2] += product.stock;
        else cate[3] += product.stock;
        idProductForFindEval.push({ idProduct: product._id });
      }
      let evaluates = [];
      if (idProductForFindEval?.length > 0) {
        evaluates = await Evaluate.find({ $or: idProductForFindEval });
      }
      stock = productAll.reduce((acc, product) => acc + product.stock, 0);
      review = evaluates.length;
      for (let i = 0; i < evaluates.length; i++) {
        sumRating += evaluates[i].rating;
        if (evaluates[i].rating > 0) {
          rating += 1;
        }
      }
      // ****************************************
      res.locals._document = cate[0];
      res.locals._uniform = cate[1];
      res.locals._stationery = cate[2];
      res.locals._other = cate[3];
      res.locals._income = income;
      res.locals._order = order;
      res.locals._stock = stock;
      res.locals._review = review;
      res.locals._sucOrder = sucOrder;
      res.locals._rating = (sumRating / rating).toFixed(1);
      if (isNaN(res.locals._rating)) {
        res.locals._rating = 0;
      }
      res.locals._percent = ((sucOrder / order) * 100).toFixed(0);
      if (isNaN(res.locals._percent)) {
        res.locals._percent = 0;
      }
      res.render("dashboard", {
        convertMoney: (str) => {
          return Number(str).toLocaleString("it-IT", {
            style: "currency",
            currency: "VND",
          });
        },
        calcPercent: (value, total) => ((value / total) * 100).toFixed(0),
      });
    } catch (err) {
      next(err);
    }
  };

  // [GET] product/manage
  getManage = async (req, res, next) => {
    try {
      let options = {
        idAccount: req.user.id,
        $or: [{ status: "Available" }, { status: "Reported" }],
      };
      // let options = { idAccount: req.user.id, status: "Available" };
      // Tìm kiếm
      let keyword = req.query.keyword || "";
      // Lọc theo loại
      let category = req.query.category || "";
      // Sắp xếp
      let sortBy = req.query.sortBy || "-updatedAt";
      keyword = keyword.trim();
      let originalUrl = req.originalUrl;
      if (keyword != "") {
        const regex = new RegExp(keyword, "i");
        options.name = regex;
      }
      if (category != "") {
        options.category = category;
      }
      // Phân trang
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 5;
      // Thực hiện truy vấn
      let products = await Product.find(options)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sortBy);
      res.locals._keyword = keyword;
      res.locals._category = category;
      res.locals._sortBy = sortBy;
      res.locals._numberOfItems = await Product.find(options).countDocuments();
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.locals._originalUrl = req.url;
      res.render("manage-product", {
        products: mutipleMongooseToObject(products),
        helpers: {
          isEqual(c1, c2) {
            return c1 == c2;
          },
          convertMoney: (str) => {
            return Number(str).toLocaleString("it-IT", {
              style: "currency",
              currency: "VND",
            });
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // [GET] product/edit/
  getEditForCreate = (req, res) => {
    res.render("edit-product", {
      helpers: {
        isCategory(c1, c2) {
          return c1 == "Document";
        },
      },
    });
  };

  // [POST] product/edit/save
  createNewProduct = async (req, res, next) => {
    try {
      // Lưu thông tin sản phẩm vào trong database
      const formData = req.body;
      formData.idAccount = req.user.id; // Ensure you're setting the correct account ID
      formData.price = Number(formData.price);
      formData.stock = Number(formData.stock);
      formData.isTrend = Number(formData.isTrend);
      formData.keyword = formData.keyword.split(",").map((str) => str.trim());
      if (formData.isTrend) {
        formData.status = "Trending";
      } else {
        formData.status = "Pending"; // Set default status
      }
      formData.isTrend = false;

      // Handling image upload
      if (req.file && !req.fileValidationError) {
        const imagePath = `./source/public${formData.image}`; // Full path for server operations
        // Check and potentially remove a previously stored image
        if (formData.image !== "/img/products/default.png" && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }

        // Correctly remove 'source/public/' from the path before saving it in formData
        formData.image = '/' + path.normalize(req.file.path).replace(/\\/g, '/').replace('source/public/', '');
      } else {
        // Handle default image case or file validation error
        formData.image = "/img/products/default.png";
      }

      const newProduct = new Product(formData);
      await newProduct.save();
      res.render("message/processing-request");
    } catch (err) {
      next(err);
    }
  };

  // [GET] product/edit/:id
  getEditForUpdate = async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      res.render("edit-product", {
        product: mongooseToObject(product),
        helpers: {
          isCategory(c1, c2) {
            return c1 == c2;
          },
        },
        getEditForUpdate: true,
      });
    } catch (err) {
      next(err);
    }
  };

  // [POST] product/edit/save/:id
  updateProduct = async (req, res, next) => {
    try {
      // console.log('Starting product update process');
  
      const formData = req.body;
      // console.log('Received form data:', formData);
  
      const product = await Product.findById(req.params.id);
      // console.log(`Product found: ${product._id}`);
  
      if (req.file) {
          // Assuming the full server path is added before storing it, which needs to be removed
          const imagePath = `./source/public${product.image}`; // Full path for server operations
          // console.log(`Handling new file upload, checking existing image at: ${imagePath}`);
  
          // Check and delete the existing image if it's not the default
          if (product.image !== "\\img\products\default.png" && fs.existsSync(imagePath)) {
            // console.log('Existing image found, deleting...');
            fs.unlinkSync(imagePath);
          } else {
            // console.log('No existing image to delete or default image used');
          }
  
          // Correctly remove 'source/public/' from the path before saving it in formData
          // console.log('req.file.path:', req.file.path);
          formData.image = '/' + path.normalize(req.file.path).replace(/\\/g, '/').replace('source/public/', '');
          // console.log('Updated image path for formData:', formData.image);
      } else if (product.image === "\\img\products\default.png") {
          formData.image = "/img/products/default.png";
          // console.log('Using default image for product');
      }
  
      formData.status = "Pending";
      // console.log('Set product status to Pending');
  
      await Product.updateOne({ _id: req.params.id }, formData);
      // console.log(`Product update complete for ID: ${req.params.id}`);
  
      res.render("message/processing-request");
      // console.log('Processing request message rendered');
    } catch (err) {
      console.error('Error during product update:', err);
      next(err);
    }
  };

  // [POST] product/delete/:id
  deleteProduct = async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      if (product.image != "/img/products/default.png") {
        fs.unlinkSync(`./source/public${product.image}`);
      }
      await Product.deleteOne({ _id: req.params.id });
      res.redirect(
        `/product/manage?page=${req.query.page ? req.query.page : ""}`
      );
    } catch (err) {
      next(err);
    }
  };

  // [GET] product/cart
  getCart = async (req, res, next) => {
    try {
      res.json(req.session.cart);
    } catch (err) {
      next(err);
    }
  };

  // [POST] product/cart
  add2Cart = async (req, res, next) => {
    try {
      // Lấy id và quantity sản phẩm gửi từ client
      let id = req.body.id;
      let quantity = parseInt(req.body.quantity);
      let product = await Product.findById(id);
      // Chuyển Mongoose obj thành obj thuần để thêm field quantity
      product = product.toObject();
      // Thêm sản phẩm vào cart của user
      if (product) {
        let isFound = false;
        isFound = req.session.cart.some((ele) => {
          if (ele._id == id) {
            ele.quantity += quantity;
            return true;
          }
        });
        if (!isFound) {
          product.quantity = quantity;
          req.session.cart.push(product);
        }
      }
      res.json(req.session.cart);
    } catch (err) {
      next(err);
    }
  };

  // [DELETE] product/cart
  deleteFromCart = async (req, res, next) => {
    try {
      await req.session.cart.forEach(async (product, idx) => {
        if (product._id == req.params.id) {
          req.session.cart.splice(idx, 1);
          req.user.cart = JSON.parse(JSON.stringify(req.session.cart));
          if (req.user) {
            let account = await Account.findById(req.user._id);
            account.cart = req.user.cart;
            await account.save();
          }
        }
      });
      res.json(req.session.cart);
    } catch (err) {
      next(err);
    }
  };

  // [GET] product/all-product
  showAllProduct = async (req, res, next) => {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 8;
      const products = await Product.find({
        $or: [{ status: "Available" }, { status: "Reported" }],
      })
        .skip((page - 1) * limit)
        .limit(limit);
      const categories = await Product.aggregate([
        {
          $match: {
            status: { $in: ["Available", "Reported"] },
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      res.locals._numberOfItems = await Product.find({
        $or: [{ status: "Available" }, { status: "Reported" }],
      }).countDocuments();
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.locals.categories = categories;
      res.locals.products = mutipleMongooseToObject(products);
      res.render("all-product");
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/all-product/category
  filterProduct = async (req, res, next) => {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 8;

      const type = req.query.category; //? req.query.category : 0
      const products = await Product.find({
        category: type,
        $or: [{ status: "Available" }, { status: "Reported" }],
      })
        .skip((page - 1) * limit)
        .limit(limit);
      const categories = await Product.aggregate([
        {
          $match: {
            status: { $in: ["Available", "Reported"] },
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 }, // Sắp xếp giảm dần dựa trên trường 'count'
        },
      ]);
      res.locals._numberOfItems = await Product.find({
        category: type,
        $or: [{ status: "Available" }, { status: "Reported" }],
      }).countDocuments();
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.locals.categories = categories;
      res.locals.products = mutipleMongooseToObject(products);

      res.render("all-product");
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/all-product/sort
  sortProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 8;
      const offset = (page - 1) * limit;
      const sort = { [req.query.sort]: req.query.order };
      
      let options = { $or: [{ status: "Available" }, { status: "Reported" }] };
      if (req.query.category) {
        options.category = req.query.category;
      }
      if (req.query.keyword && req.query.keyword.trim() !== "") {
        options.name = new RegExp(req.query.keyword, "i");
      }

      const products = await ProductRepository.findProducts(options, sort, { offset, limit });
      const categories = await ProductRepository.aggregateCategories(["Available", "Reported"]);
      const numberOfItems = await ProductRepository.countProducts(options);

      res.locals = {
        _numberOfItems: numberOfItems,
        _limit: limit,
        _currentPage: page,
        categories: categories,
        products: mutipleMongooseToObject(products)
      };

      res.render("all-product");
    } catch (error) {
      next(error);
    }
  };

  searchProduct = async (req, res, next) => {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 8;
      const offset = (page - 1) * limit;

      const keyword = req.query.keyword || "";
      if (keyword.trim() != "") {
        const regex = new RegExp(keyword, "i");
        const options = { $or: [{ status: "Available" }, { status: "Reported" }] };

        const products = await ProductRepository.searchProductsByKeyword(keyword, options, { offset, limit });
        const categories = await ProductRepository.aggregateCategories(["Available", "Reported"]);
        const numberOfItems = await ProductRepository.countProductsByKeyword(keyword, options);
        res.locals._limit = limit;
        res.locals._currentPage = page;
        res.locals._numberOfItems = numberOfItems;

        res.locals.categories = categories;
        res.locals.products = mutipleMongooseToObject(products);
        res.render("all-product");
      } else res.redirect("back");
    } catch (error) {
      next(error);
    }
  };

  showSpecificProduct = async (req, res, next) => {
    try {
      const productId = req.params.id;

      const product = await ProductRepository.findProductById(productId);
      const details = product.description.split("\n");
      const evaluates = await ProductRepository.findEvaluationsByProductId(productId);
      const evaNumber = await ProductRepository.countEvaluationsByProductId(productId);
      const avgRating = await ProductRepository.calculateAverageRating(productId);
      const related = await ProductRepository.findRelatedProducts(product.keyword);

      res.locals.evaNumber = evaNumber;
      res.locals.details = details;
      res.locals.product = mongooseToObject(product);
      res.locals.stars = avgRating;
      res.locals.related = related;
      res.locals.evaluates = mutipleMongooseToObject(evaluates);

      res.render("specific-product", {
        helpers: {
          isEqual(c1, c2) {
            return c1 == c2;
          },
          convertMoney: (str) => {
            return Number(str).toLocaleString("it-IT", {
              style: "currency",
              currency: "VND",
            });
          },
        },
        stock: product.stock,
        formatCurrency: formatCurrency,
      });
    } catch (error) {
      next(error);
    }
  };

  // [PUT] product/specific-product/:id/report
  reportProduct = async (req, res, next) => {
    try {
      const productId = req.params.id;
      await ProductRepository.updateProductStatus(productId, "Reported");
      res.redirect("back");
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/full (Admin - Products)
  getFullProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;
      const searchQuery = req.query.search || '';
      const statusFilter = req.query.status || '';
      // console.log('Search query:', searchQuery);

      const products = await ProductRepository.findAllProductsPaginated(page, limit, searchQuery, statusFilter);
      // console.log('Products:', products);
      const allProducts = mutipleMongooseToObject(products);

      const numberOfItems = await ProductRepository.countAllProducts(searchQuery, statusFilter);

      if (req.query.json) {
        // If a 'json' query parameter is present, respond with JSON
        return res.json({
          products: allProducts,
          _numberOfItems: numberOfItems,
          _limit: limit,
          _currentPage: page
        });
      }

      // Otherwise, render the page as usual
      res.render("admin_product_all", {
        products: allProducts,
        numOfProducts: allProducts.length,
        _numberOfItems: numberOfItems,
        _limit: limit,
        _currentPage: page
      });
    } catch (error) {
      console.error('Error in getFullProduct:', error);
      next(error);
    }
  };

  // [GET] product/banned
  getBannedProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const product1 = await ProductRepository.findBannedProductsPaginated(page, limit);
      const allProducts = mutipleMongooseToObject(product1);

      const numberOfItems = await ProductRepository.countBannedProducts();

      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.render("admin_product_banned", {
        products: allProducts,
        numOfProducts: allProducts.length,
      });
    } catch (error) {
      next(error);
    }
  };

  // [GET] reported/pending
  getPendingProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const product1 = await ProductRepository.findPendingProductsPaginated(page, limit);
      const allProducts = mutipleMongooseToObject(product1);

      const numberOfItems = await ProductRepository.countPendingProducts();

      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.render("admin_product_pending", {
        products: allProducts,
        numOfProducts: allProducts.length,
      });
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/reported
  getReportedProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const product1 = await ProductRepository.findReportedProductsPaginated(page, limit);
      const allProducts = mutipleMongooseToObject(product1);

      const numberOfItems = await ProductRepository.countReportedProducts();

      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.render("admin_product_reported", {
        products: allProducts,
        numOfProducts: allProducts.length,
      });
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/trending
  getTrendProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;

      const product1 = await ProductRepository.findTrendingProductsPaginated(page, limit);
      const allProducts = mutipleMongooseToObject(product1);

      const numberOfItems = await ProductRepository.countTrendingProducts();

      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;

      res.render("admin_product_trending", {
        products: allProducts,
        numOfProducts: allProducts.length,
      });
    } catch (error) {
      next(error);
    }
  };

  // [POST] account/exec-product
  executeProduct = async (req, res, next) => {
    try {
      const productId = req.query.id;
      const actionType = req.query.type;

      await ProductRepository.updateProductStatusById(productId, actionType);
      res.redirect("back");
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new productController();
