// const hbs = require("express-handlebars");
const Order = require("../models/order.model");
const Account = require("../models/account.model");
const Product = require("../models/product.model");
const { getIo } = require('../source/public/js/socket');
const ProductRepository = require('../repositories/ProductRepository');
const AccountRepository = require('../repositories/AccountRepository');
const OrderRepository = require('../repositories/OrderRepository');


// const sequelize = require("sequelize");
// const Op = sequelize.Op;

const {
  mutipleMongooseToObject,
  mongooseToObject,
} = require("../utils/mongoose");

// var allProducts;

class orderController {
  // [GET] order/manage-order
  showAllOrder = async (req, res, next) => {
    try {
      let page = isNaN(req.query.page)
        ? 1
        : Math.max(1, parseInt(req.query.page));
      const limit = 18;
      const accountId = req.user._id;

      const orders = await OrderRepository.findOrdersBySeller(accountId, page, limit);
      const orderObject = mutipleMongooseToObject(orders);

      var products = [];
      var messages = [];
      for (var i of orderObject) {
        messages.push({ idOrder: i._id, message: i.message });
        for (var j of i.detail) {
          Object.assign(j, { idOrder: i._id });
          products.push(j);
        }
      }

      const totalItems = await OrderRepository.countOrdersBySeller(accountId);

      res.locals._numberOfItems = totalItems;
      res.locals._limit = limit;
      res.locals._currentPage = page;
      res.locals.orders = orderObject;
      res.locals.products = products;
      res.locals.messages = messages;

      res.render("manage-order");
    } catch (error) {
      next(error);
    }
  };

  // [POST] product/quantity
  getQuantity = async (req, res, next) => {
    try {
      const orderId = req.body.id;
      const order = await OrderRepository.getOrderById(orderId);
      res.json(order);
    } catch (error) {
      next(error);
    }
  };

  // [PUT] order/manage-order/:id/reject
  rejectOrder = async (req, res, next) => {
    try {
      const orderId = req.params.id;
      await OrderRepository.updateOrderStatus(orderId, "cancelled");
      res.redirect("back");
    } catch (error) {
      next(error);
    }
  };

  acceptOrder = async (req, res, next) => {
    try {
      const io = getIo();
      const orderId = req.params.id;
      const order = await OrderRepository.findOrderById(orderId);

      for (const product of order.detail) {
        const newStock = await ProductRepository.updateProductStock(product.idProduct, product.quantity);

        // Emitting an event to all connected clients that the stock has been updated
        io.emit('stockUpdate', { productId: product.idProduct.toString(), newStock });

        // Optional console log removed for cleanliness
      }

      await OrderRepository.updateOrderStatus(orderId, "successful");

      // Emit an event to update order status in the buyer's view
      console.log('io.emit: orderStatusChange');
      io.emit('orderStatusChange', { orderId, newStatus: "successful" });

      res.redirect("back");
    } catch (error) {
      next(error);
    }
  };

  getPayment = async (req, res, next) => {
    try {
      const accBuyer = await AccountRepository.findAccountById(req.user.id);
      const product = await ProductRepository.getProductWithAccount(req.params._id);

      res.locals.accBuyer = mongooseToObject(accBuyer);
      res.locals.product = mongooseToObject(product);
      res.locals.quantity = req.query.quantity;

      res.render("payment");
    } catch (error) {
      next(error);
    }
  };

  getPayForCart = async (req, res, next) => {
    try {
      const accBuyer = await AccountRepository.findAccountWithPopulatedCart(req.user.id);

      res.locals.accBuyer = mongooseToObject(accBuyer);

      // Calculate the total value of the cart
      const totalCartValue = accBuyer.cart.reduce((total, item) => {
        return total + (item._id.price * item.quantity);
      }, 0);

      res.render("payment-for-cart", { totalCartValue: totalCartValue });
    } catch (error) {
      next(error);
    }
  };

  // placeOrder = async (req, res, next) => {
  //   try {
  //     const accBuyer = await AccountRepository.findAccountById(req.user.id);
  //     const product = await ProductRepository.getProductWithAccount(req.params._id);

  //     const orderDetails = [{
  //       idSeller: product.idAccount,
  //       idProduct: product._id,
  //       quantity: req.query.quantity
  //     }];

  //     await OrderRepository.createOrder(accBuyer, orderDetails, req.body.message);
  //     res.redirect(`/account/my-order-pending/${req.user.id}`);
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  // buy now
  placeOrder = async (req, res, next) => {
    try {
      const io = getIo();
      const accBuyer = await Account.findOne({ _id: req.user.id });
      const product = await Product.findOne({ _id: req.params._id }).populate(
        "idAccount"
      );
      const idSeller = product.idAccount;

      const newOrder = new Order({
        idAccount: accBuyer._id,
        idSeller: idSeller,
        detail: [
          {
            idProduct: product._id,
            quantity: req.query.quantity,
            isEvaluated: false,
          },
        ],
        status: "pending",
        message: req.body.message,
      });

      await newOrder.save(); // Lưu order mới vào MongoDB

      // Fetch the newly saved order with populated fields
      const populatedOrder = await Order.findById(newOrder._id)
        .populate({
          path: 'idAccount',
          select: 'firstName lastName email phone' // Adjust fields according to what you need
        })
        .populate({
          path: 'detail.idProduct',
          select: 'name image category price' // Specify the fields you need from the product
        });

      console.log('io.emit: orderUpdate');
      io.emit('orderUpdate', {
        order: populatedOrder,
        message: 'New order placed'
      });

      res.redirect(`/account/my-order-pending/${req.user.id}`);
    } catch (err) {
      next(err);
    }
  };

  // cart checkout
  placeOrderForCart = async (req, res, next) => {
    try {
      const accBuyer = await Account.findOne({ _id: req.user.id })
        .populate("cart._id")
        .populate("cart._id.idAccount");

      const orderDetails = accBuyer.cart.map(cartItem => ({
        idSeller: cartItem._id.idAccount,
        idProduct: cartItem._id._id,
        quantity: cartItem.quantity
      }));

      const savedOrders = await this.createAndSaveOrder(accBuyer, orderDetails, req.body.message);

      // Filter out items that have been ordered
      accBuyer.cart = accBuyer.cart.filter(
        cartItem => !savedOrders.some(
          savedOrder => savedOrder.detail[0].idProduct.equals(cartItem._id._id)
        )
      );
      req.session.cart = [];
      await accBuyer.save();

      res.redirect(`/account/my-order-pending/${req.user.id}`);
    } catch (error) {
      next(error);
    }
  };

  createAndSaveOrder = async (accBuyer, details, message) => {
    const io = getIo();
    const orders = details.map(detail => {
      return new Order({
        idAccount: accBuyer._id,
        idSeller: detail.idSeller,
        detail: [{
          idProduct: detail.idProduct,
          quantity: detail.quantity,
          isEvaluated: false
        }],
        status: "pending",
        message: message
      });
    });

    const savedOrders = await Order.insertMany(orders);

    // Fetch orders again with populated fields, including product details
    const populatedOrders = await Promise.all(savedOrders.map(async order => {
      return await Order.findById(order._id)
        .populate({
          path: 'idAccount'
        })
        .populate({
          path: 'detail.idProduct',
          select: 'name image category price'  // Specify the fields you need from the product
        });
    }));

    console.log('io.emit: orderUpdate');

    // Emit an event after saving and populating orders successfully
    populatedOrders.forEach(order => {
      io.emit('orderUpdate', {
        order: order,
        message: 'New pending order created'
      });
    });

    return populatedOrders;
  };
}

module.exports = new orderController();
