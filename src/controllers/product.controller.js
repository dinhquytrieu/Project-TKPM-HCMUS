// product.controller.js
const Product = require("../models/product.model");
const fs = require("fs");
const Evaluate = require("../models/evaluate.model");
// const Account = require("../models/account.model");
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
const AccountRepository = require("../repositories/AccountRepository");

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
  //   getManage = async (req, res, next) => {
  //     try {
  //         const { id } = req.user;
  //         const keyword = (req.query.keyword || "").trim();
  //         const category = req.query.category || "";
  //         const sortBy = req.query.sortBy || "-updatedAt";
  //         const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
  //         const limit = 5;

  //         const { products, numberOfItems } = await ProductRepository.findProductsByAccountAndFilters(
  //             id, keyword, category, sortBy, page, limit
  //         );

  //         res.locals = {
  //             _keyword: keyword,
  //             _category: category,
  //             _sortBy: sortBy,
  //             _numberOfItems: numberOfItems,
  //             _limit: limit,
  //             _currentPage: page,
  //             _originalUrl: req.url,
  //         };

  //         res.render("manage-product", {
  //             products: mutipleMongooseToObject(products),
  //             helpers: {
  //                 isEqual(c1, c2) {
  //                     return c1 == c2;
  //                 },
  //                 convertMoney: (str) => {
  //                     return Number(str).toLocaleString("it-IT", {
  //                         style: "currency",
  //                         currency: "VND",
  //                     });
  //                 },
  //             },
  //         });
  //     } catch (err) {
  //         next(err);
  //     }
  // };

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
      // Prepare the form data
      const formData = {
        ...req.body,
        idAccount: req.user.id,
        price: Number(req.body.price),
        stock: Number(req.body.stock),
        isTrend: Number(req.body.isTrend),
        keyword: req.body.keyword.split(",").map(str => str.trim())
      };

      // Determine if the product is trending
      if (formData.isTrend) {
        formData.status = "Trending";
        formData.isTrend = false; // Reset isTrend to false if needed after setting status
      }

      // // Handle product image
      // if (req.file && !req.fileValidationError) {
      //     formData.image = req.file.path.replace("source/public", "");
      // } else {
      //     formData.image = "/img/products/default.png";
      // }

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

      // Create the product using the repository
      await ProductRepository.createProduct(formData);

      // Render a success or processing message
      res.render("message/processing-request");
    } catch (err) {
      next(err);
    }
  };


  // [GET] product/edit/:id
  getEditForUpdate = async (req, res, next) => {
    try {
      // Fetch the product using the repository
      const product = await ProductRepository.findProductById(req.params.id);

      // Render the edit product page with the product data
      res.render("edit-product", {
        product: mongooseToObject(product), // Convert the Mongoose model to a plain JavaScript object for the view
        helpers: {
          isCategory(c1, c2) {
            return c1 == c2;
          },
        },
        getEditForUpdate: true,
      });
    } catch (err) {
      // Handle errors such as product not found or database errors
      next(err);
    }
  };

  // [POST] product/edit/save/:id
  updateProduct = async (req, res, next) => {
    try {
      const formData = req.body;
      const hasNewFile = Boolean(req.file);

      // Pass the full file path if a new file is uploaded, otherwise pass the existing path
      const imagePath = hasNewFile ? req.file.path : '';

      // Call the repository function to update the product
      await ProductRepository.updateProduct(req.params.id, formData, imagePath, hasNewFile);

      // Render a processing request message
      res.render("message/processing-request");
    } catch (err) {
      console.error('Error during product update:', err);
      next(err);
    }
  };


  // [POST] product/delete/:id
  deleteProduct = async (req, res, next) => {
    try {
      // Call the repository function to delete the product
      await ProductRepository.deleteProduct(req.params.id);

      // Redirect to the product management page, maintaining the current pagination state
      res.redirect(`/product/manage?page=${req.query.page ? req.query.page : ""}`);
    } catch (err) {
      console.error('Error during product deletion:', err);
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
      // let product = await Product.findById(id);
      let product = await ProductRepository.findProductById(id);
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
            // let account = await Account.findById(req.user._id);
            let account = await AccountRepository.findById(req.user._id);
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
      const page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 8;
      const productOptions = {
        $or: [{ status: "Available" }, { status: "Reported" }]
      };

      // Use repository methods to handle data fetching
      const products = await ProductRepository.findPaginatedProducts(productOptions, page, limit);
      const categories = await ProductRepository.aggregateProductCategories(["Available", "Reported"]);
      const numberOfItems = await ProductRepository.countProducts(productOptions);

      // Setting up local variables for the view
      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.locals.categories = categories;
      res.locals.products = mutipleMongooseToObject(products);

      // res.render("all-product");
      res.render("all-product", {
        convertMoney: (str) => {
          return Number(str).toLocaleString("it-IT", {
            style: "currency",
            currency: "VND",
          });
        },
      });
    } catch (error) {
      next(error);
    }
  };


  // [GET] product/all-product/category
  filterProduct = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 8;
      const type = req.query.category;

      const filterOptions = {
        category: type,
        $or: [{ status: "Available" }, { status: "Reported" }]
      };

      // Use repository methods to handle data fetching
      const products = await ProductRepository.findFilteredProducts(filterOptions, page, limit);
      const categories = await ProductRepository.aggregateCategoriesByStatus(["Available", "Reported"]);
      const numberOfItems = await ProductRepository.countFilteredProducts(filterOptions);

      // Setting up local variables for the view
      res.locals._numberOfItems = numberOfItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.locals.categories = categories;
      res.locals.products = mutipleMongooseToObject(products);

      // res.render("all-product");
      res.render("all-product", {
        convertMoney: (str) => {
          return Number(str).toLocaleString("it-IT", {
            style: "currency",
            currency: "VND",
          });
        },
        formatCurrency: formatCurrency,
      });
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

      // res.locals = {
      //   _numberOfItems: numberOfItems,
      //   _limit: limit,
      //   _currentPage: page,
      //   categories: categories,
      //   products: mutipleMongooseToObject(products)
      // };

      res.locals._numberOfItems = await Product.find(options).countDocuments();
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.locals.categories = categories;
      res.locals.products = mutipleMongooseToObject(products);

      res.render("all-product", {
        convertMoney: (str) => {
          return Number(str).toLocaleString("it-IT", {
            style: "currency",
            currency: "VND",
          });
        },
        formatCurrency: formatCurrency,
      });
    } catch (error) {
      next(error);
    }
  };

  // [GET] product/all-product/search
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

  // [GET] product/specific-product
  // showSpecificProduct = async (req, res, next) => {
  //   try {
  //     const productId = req.params.id;

  //     const product = await ProductRepository.findProductById(productId);
  //     const details = product.description.split("\n");
  //     const evaluates = await ProductRepository.findEvaluationsByProductId(productId);
  //     const evaNumber = await ProductRepository.countEvaluationsByProductId(productId);
  //     const avgRating = await ProductRepository.calculateAverageRating(productId);
  //     const related = await ProductRepository.findRelatedProducts(product.keyword, productId);

  //     res.locals.evaNumber = evaNumber;
  //     res.locals.details = details;
  //     res.locals.product = mongooseToObject(product);
  //     res.locals.stars = avgRating;
  //     res.locals.related = related;
  //     res.locals.evaluates = mutipleMongooseToObject(evaluates);

  //     res.render("specific-product", {
  //       helpers: {
  //         isEqual(c1, c2) {
  //           return c1 == c2;
  //         },
  //         convertMoney: (str) => {
  //           return Number(str).toLocaleString("it-IT", {
  //             style: "currency",
  //             currency: "VND",
  //           });
  //         },
  //       },
  //       stock: product.stock,
  //       formatCurrency: formatCurrency,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  showSpecificProduct = async (req, res, next) => {
    try {
      const productId = req.params.id;

      const product = await Product.findOne({ _id: productId });
      const details = product.description.split("\n");
      const evaluates = await Evaluate.find({ idProduct: productId })
        .populate({
          path: "idAccount",
          select: "firstName lastName avatar",
        })
        .sort({ date: -1 });

      const evaNumber = await Evaluate.find({ idProduct: productId })
        .populate({
          path: "idAccount",
          select: "firstName lastName avatar",
        })
        .sort({ date: -1 })
        .countDocuments();
      const ratings = await Evaluate.find({
        idProduct: productId,
        rating: { $ne: 0 },
      }).select("rating");
      const totalRatings = ratings.length;
      const sumRatings = ratings.reduce(
        (sum, rating) => sum + rating.rating,
        0
      );
      const avgRating = sumRatings / totalRatings;

      const related = await Product.aggregate([
        {
          $match: {
            keyword: product.keyword,
          },
        },
        { $limit: 6 },
      ]);

      res.locals.evaNumber = evaNumber;
      res.locals.details = details;
      res.locals.product = mongooseToObject(product);
      res.locals.stars = avgRating;
      res.locals.related = related;
      res.locals.evaluates = mutipleMongooseToObject(evaluates);

      // res.render("specific-product", {
      //   formatCurrency: formatCurrency,
      // });
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
  // getTrendProduct = async (req, res, next) => {
  //   try {
  //     const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
  //     const limit = 10;

  //     const product1 = await ProductRepository.findTrendingProductsPaginated(page, limit);
  //     const allProducts = mutipleMongooseToObject(product1);

  //     const numberOfItems = await ProductRepository.countTrendingProducts();

  //     res.locals._numberOfItems = numberOfItems;
  //     res.locals._limit = limit;
  //     res.locals._currentPage = page;

  //     res.render("admin_product_trending", {
  //       products: allProducts,
  //       numOfProducts: allProducts.length,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  getTrendProduct = async (req, res, next) => {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));

      const limit = 10;
      const product1 = await Product.find({
        $or: [{ status: "Available", isTrend: true }, { status: "Trending" }],
      })
        .populate("idAccount")
        .sort({ time: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const allProducts = mutipleMongooseToObject(product1);
      res.locals._numberOfItems = await Product.find({
        $or: [{ status: "Available", isTrend: true }, { status: "Trending" }],
      }).countDocuments();
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
