// This middleware aims to synchronize the cart items in the session 
// with the user's cart stored in the database whenever a user is logged in

const Account = require("../models/account.model");
const Product = require("../models/product.model");
const { mongooseToObject } = require("../utils/mongoose");

// async function initCart(req, res, next) {
//   try {
//     // Check if user is logged in to synchronize the cart items
//     if (req.user) {
//       // Deep copy the carts
//       const reqUserCart = JSON.parse(JSON.stringify(req.user.cart));
//       const reqSessionCart = JSON.parse(JSON.stringify(req.session.cart));

//       // Synchronize from user's cart to session cart
//       for (const eleUser of reqUserCart) {
//         let isFound = false;
//         for (const eleSess of reqSessionCart) {
//           if (eleUser._id == eleSess._id) {
//             if (eleUser.quantity != eleSess.quantity) {
//               const maxQuantity = Math.max(eleUser.quantity, eleSess.quantity);
//               req.user.cart.find(item => item._id === eleUser._id).quantity = maxQuantity;
//               req.session.cart.find(item => item._id === eleSess._id).quantity = maxQuantity;
//             }
//             isFound = true;
//             break; // Stop the inner loop once a match is found
//           }
//         }
//         // If not found, add the product info from the database to the session cart
//         if (!isFound) {
//           let productInfo = await Product.findById(eleUser._id);
//           if (productInfo) {
//             productInfo = mongooseToObject(productInfo);
//             productInfo.quantity = eleUser.quantity;
//             req.session.cart.push(productInfo);
//           }
//         }
//       }

//       // Synchronize from session cart to user's cart
//       for (const eleSess of reqSessionCart) {
//         let isFound = false;
//         for (const eleUser of reqUserCart) {
//           if (eleUser._id == eleSess._id) {
//             isFound = true;
//             break; // Stop the inner loop once a match is found
//           }
//         }
//         if (!isFound) {
//           req.user.cart.push({
//             _id: eleSess._id,
//             quantity: eleSess.quantity
//           });
//         }
//       }

//       // Save the updated user cart to the database
//       await Account.findOneAndUpdate(
//         { _id: req.user._id },
//         { cart: req.user.cart }
//       );

//       // Update the local variable for displaying cart quantity in UI
//       const cart = req.session.cart;
//       res.locals._cartNumber = cart.reduce(
//         (accum, product) => accum + product.quantity,
//         0
//       );
//     }
//   } catch (err) {
//     next(err);
//   }
// }

// module.exports = initCart;

async function initCart(req, res, next) {
  try {
    // Check if user is logged in to synchronize the cart items
    if (req.user) {
      // Deep copy the carts
      const reqUserCart = JSON.parse(JSON.stringify(req.user.cart));
      const reqSessionCart = JSON.parse(JSON.stringify(req.session.cart));

      // Synchronize from user's cart to session cart
      reqUserCart.forEach(async (eleUser) => {
        let isFound = reqSessionCart.some(eleSess => eleSess._id === eleUser._id);
        if (!isFound) {
          let productInfo = await Product.findById(eleUser._id);
          productInfo = mongooseToObject(productInfo);
          productInfo.quantity = eleUser.quantity;
          req.session.cart.push(productInfo);
        } else {
          const sessionItem = reqSessionCart.find(eleSess => eleSess._id === eleUser._id);
          const maxQuantity = Math.max(eleUser.quantity, sessionItem.quantity);
          sessionItem.quantity = maxQuantity;
        }
      });

      // Synchronize from session cart to user's cart
      reqSessionCart.forEach((eleSess) => {
        let userItem = reqUserCart.find(eleUser => eleUser._id === eleSess._id);
        if (!userItem) {
          reqUserCart.push({
            _id: eleSess._id,
            quantity: eleSess.quantity,
          });
        } else {
          userItem.quantity = eleSess.quantity; // Ensure quantity is synchronized
        }
      });

      // Update the user cart in the database
      await Account.findOneAndUpdate(
        { _id: req.user._id },
        { cart: reqUserCart }
      );

      // Update the cart number to reflect the count of unique items
      res.locals._cartNumber = reqSessionCart.length; // Count of unique products
    }
  } catch (err) {
    next(err);
  }
}

module.exports = initCart;