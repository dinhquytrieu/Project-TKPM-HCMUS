const Order = require("../models/order.model");

class OrderRepository {

  async findOrdersBySeller(accountId, page, limit) {
    const orders = await Order.find({ idSeller: accountId })
      .sort({ date: -1 })
      .populate("idAccount")
      .populate("detail.idProduct")
      .skip((page - 1) * limit)
      .limit(limit);
    return orders;
  }

  async countOrdersBySeller(accountId) {
    return Order.find({ idSeller: accountId })
      .populate("idAccount")
      .populate("detail.idProduct")
      .countDocuments();
  }

  async getOrderById(orderId) {
    const order = await Order.find({ _id: orderId });
    return order;
  }

  async updateOrderStatus(orderId, status) {
    await Order.updateOne(
      { _id: orderId },
      { $set: { status: status } }
    );
  }

  async createOrder(account, orderDetails, message) {
    const order = new Order({
      idAccount: account._id,
      detail: orderDetails,
      message: message
    });
    await order.save();
    return order;
  }

  async findOrderById(orderId) {
    const order = await Order.findById(orderId);
    return order;
  }

  async findOrdersByAccountId(accountId, status) {
    return Order.find({ idAccount: accountId, status })
      .populate("idAccount")
      .populate("detail.idProduct")
      .populate("idSeller")
      .sort({ date: -1 });
  }

  async findOrderForEvaluation(accountId, productId) {
    return await Order.findOne({
        idAccount: accountId,
        "detail.idProduct": productId,
        "detail.isEvaluated": false
    });
}

async saveOrder(order) {
    return await order.save();
}
}

module.exports = new OrderRepository();
