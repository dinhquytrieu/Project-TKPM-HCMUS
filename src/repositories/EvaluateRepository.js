const Evaluate = require("../models/evaluate.model");
const Product = require("../models/product.model");


class EvaluateRepository {
    async updateStatusById(id, status) {
        try {
            return await Evaluate.updateOne({ _id: id }, { $set: { status: status } });
        } catch (error) {
            throw error;
        }
    }

    async createEvaluate(data) {
        try {
            const newEvaluate = new Evaluate(data);
            return await newEvaluate.save();
        } catch (error) {
            throw error;
        }
    }

    async getFilteredEvaluates(userId, page, limit) {
        const evaluations = await Evaluate.find({ reply: "" })
            .populate({
                path: "idProduct",
                populate: { path: "idAccount", match: { _id: userId } }
            })
            .populate("idAccount");

        const filteredEvaluates = evaluations.filter(evaluate => 
            evaluate.idProduct.idAccount !== null
        );

        const sortedAndLimitedData = filteredEvaluates
            .sort((a, b) => b.date - a.date)
            .slice((page - 1) * limit, page * limit);

        return sortedAndLimitedData;
    }

    async countProducts() {
        return await Product.countDocuments();
    }

    async replyToEvaluate(idEvaluate, replyContent) {
        try {
            return await Evaluate.updateOne(
                { _id: idEvaluate },
                { $set: { reply: replyContent } }
            );
        } catch (error) {
            throw error;
        }
    }

    async createEvaluate(data) {
        const newEvaluate = new Evaluate(data);
        return await newEvaluate.save();
    }

    async replyToEvaluate(idEvaluate, replyContent) {
        try {
            return await Evaluate.updateOne(
                { _id: idEvaluate },
                { $set: { reply: replyContent } }
            );
        } catch (error) {
            throw error;
        }
    }

    async getAllEvaluates(page, limit) {
        const evaluates = await Evaluate.find({})
            .populate("idAccount")
            .populate({
                path: "idProduct",
                populate: { path: "idAccount" }
            })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return evaluates;
    }

    async countEvaluates() {
        return await Evaluate.countDocuments();
    }

    async getReportedEvaluates(page, limit) {
        const evaluates = await Evaluate.find({ status: "reported" })
            .populate("idAccount")
            .populate({
                path: "idProduct",
                populate: { path: "idAccount" }
            })
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return evaluates;
    }

    async countReportedEvaluates() {
        return await Evaluate.countDocuments({ status: "reported" });
    }

    async findById(id) {
        return await Evaluate.findById(id);
    }

    async deleteById(id) {
        return await Evaluate.deleteOne({ _id: id });
    }
}

module.exports = EvaluateRepository;
