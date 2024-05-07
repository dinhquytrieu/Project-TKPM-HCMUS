const Order = require("../models/order.model");

class OrderRepository {
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
