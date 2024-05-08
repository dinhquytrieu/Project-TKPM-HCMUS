const Evaluate = require("../models/evaluate.model");
const Account = require("../models/account.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const ProductRepository = require('../repositories/ProductRepository');
const EvaluateRepository = require('../repositories/EvaluateRepository');
const AccountRepository = require('../repositories/AccountRepository');
const OrderRepository = require("../repositories/OrderRepository");

const evaluateRepository = new EvaluateRepository();

const fs = require("fs");

const {
    mutipleMongooseToObject,
    mongooseToObject,
} = require("../utils/mongoose");
const { convertDate } = require("../helpers/handlebars");

class evaluateController {
    // [PUT] /specific-product/:id/report
    reportEvaluate = async (req, res, next) => {
        try {
            const evaluateId = req.params.id;
            await evaluateRepository.updateStatusById(evaluateId, "reported");
            res.redirect("back");
        } catch (error) {
            res.status(500).json({ error: "Lỗi khi lấy tất cả sản phẩm 1" });
        }
    };

    // [PUT] /specific-product/create
    createEvaluate = async (req, res, next) => {
        try {
            const idAccount = req.user._id;
            const cmtInput = req.body.cmtInput;
            const idProduct = req.params.id;

            await evaluateRepository.createEvaluate({
                idAccount: idAccount,
                idProduct: idProduct,
                content: cmtInput,
            });
            res.redirect("back");
        } catch (error) {
            next(error);
        }
    };

    // [GET] /sales-page/review
    showEvaluate = async (req, res, next) => {
        try {
            let page = isNaN(req.query.page)
                ? 1
                : Math.max(1, parseInt(req.query.page));
            const limit = 4;
            const userId = req.user._id;

            const evaluations = await evaluateRepository.getFilteredEvaluates(userId, page, limit);
            const numberOfItems = await evaluateRepository.countProducts();

            res.locals._numberOfItems = numberOfItems;
            res.locals._limit = limit;
            res.locals._currentPage = page;
            res.locals.evaluates = mutipleMongooseToObject(evaluations);

            res.render("review-shop");
        } catch (error) {
            next(error);
        }
    };

    // [POST] /evaluate/review/:id/reply
    replyEvaluate = async (req, res, next) => {
        try {
            const idEvaluate = req.params.id;
            const replyShop = req.body.reply;

            await evaluateRepository.replyToEvaluate(idEvaluate, replyShop);
            res.redirect("back");
        } catch (error) {
            next(error);
        }
    };

    evaluateAndRating = async (req, res, next) => {
        try {
            const accBuyer = await AccountRepository.findAccountById(req.user.id);
            const product = await ProductRepository.findProductById(req.params._id);
            const order = await OrderRepository.findOrderForEvaluation(accBuyer._id, product._id);

            await evaluateRepository.createEvaluate({
                idAccount: accBuyer._id,
                idProduct: product._id,
                content: req.body.review,
                rating: req.body.rate
            });

            order.detail.forEach(detailItem => {
                if (detailItem.idProduct.equals(product._id)) {
                    detailItem.isEvaluated = true;
                }
            });

            await OrderRepository.saveOrder(order);
            res.redirect(`/account/my-order/${req.user.id}`);
        } catch (err) {
            next(err);
        }
    };

    // [POST] /sales-page/:id/reply
    replyEvaluate = async (req, res, next) => {
        try {
            const idEvaluate = req.params.id;
            const replyShop = req.body.reply;

            await evaluateRepository.replyToEvaluate(idEvaluate, replyShop);
            res.redirect("back");
        } catch (error) {
            res.status(500).json({ error: "Lỗi khi lấy tất cả sản phẩm 1" });
        }
    };

    getAllEvaluate = async (req, res, next) => {
        try {
            let page = isNaN(req.query.page)
                ? 1
                : Math.max(1, parseInt(req.query.page));
            const limit = 10;

            const evaluates = await evaluateRepository.getAllEvaluates(page, limit);
            const allEvaluate = mutipleMongooseToObject(evaluates);
            const count = await evaluateRepository.countEvaluates();

            res.locals._numberOfItems = count;
            res.locals._limit = limit;
            res.locals._currentPage = page;

            res.render("admin_comment_all", {
                evaluate: allEvaluate,
                convertDate: convertDate
            });
        } catch (error) {
            next(error);
        }
    };

    getReportedEvaluate = async (req, res, next) => {
        try {
            let page = isNaN(req.query.page)
                ? 1
                : Math.max(1, parseInt(req.query.page));
            const limit = 10;

            const evaluates = await evaluateRepository.getReportedEvaluates(page, limit);
            const allEvaluate = mutipleMongooseToObject(evaluates);
            const count = await evaluateRepository.countReportedEvaluates();

            res.locals._numberOfItems = count;
            res.locals._limit = limit;
            res.locals._currentPage = page;

            res.render("admin_comment_reported", {
                evaluate: allEvaluate,
                convertDate: convertDate
            });
        } catch (error) {
            next(error);
        }
    };

    deleteEvaluate = async (req, res, next) => {
        try {
            const idEvaluate = req.query.id;

            // Optionally find the evaluate if you need to perform checks or logging before deletion
            const evaluate = await evaluateRepository.findById(idEvaluate);
            if (!evaluate) {
                return res.status(404).json({ message: "Evaluate not found" });
            }

            const remove = await evaluateRepository.deleteById(idEvaluate);
            res.redirect("back");
        } catch (err) {
            next(err);
        }
    };
}

module.exports = new evaluateController();
