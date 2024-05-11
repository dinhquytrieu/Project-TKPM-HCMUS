// product.repository.js
const Product = require("../models/product.model");
const Evaluate = require("../models/evaluate.model");

class ProductRepository {
    async findProducts(options, sort, pagination) {
        const products = await Product.find(options)
            .sort(sort)
            .skip(pagination.offset)
            .limit(pagination.limit);
        return products;
    }

    async countProducts(options) {
        return await Product.find(options).countDocuments();
    }

    async aggregateCategories(statuses) {
        return await Product.aggregate([
            {
                $match: { status: { $in: statuses } },
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
    }

    async searchProductsByKeyword(keyword, options, pagination) {
        const regex = new RegExp(keyword, 'i');
        options.name = regex;
        return await Product.find(options)
            .skip(pagination.offset)
            .limit(pagination.limit);
    }

    async countProductsByKeyword(keyword, options) {
        const regex = new RegExp(keyword, 'i');
        options.name = regex;
        return await Product.find(options).countDocuments();
    }

    async findProductById(productId) {
        return await Product.findOne({ _id: productId });
    }

    async findEvaluationsByProductId(productId) {
        return await Evaluate.find({ idProduct: productId })
            .populate({
                path: "idAccount",
                select: "firstName lastName avatar",
            })
            .sort({ date: -1 });
    }

    async countEvaluationsByProductId(productId) {
        return await Evaluate.find({ idProduct: productId }).countDocuments();
    }

    async calculateAverageRating(productId) {
        const ratings = await Evaluate.find({
            idProduct: productId,
            rating: { $ne: 0 },
        }).select("rating");
        const total = ratings.length;
        const sum = ratings.reduce((acc, item) => acc + item.rating, 0);
        return total > 0 ? sum / total : 0;
    }

    findRelatedProducts = async (keyword, currentProductId) => {
        try {
            const relatedProducts = await Product.aggregate([
                {
                  $match: {
                    keyword: keyword,
                    _id: { $ne: currentProductId } // Exclude the current product from related products
                  },
                },
                { $limit: 6 },
              ]);
            // Product.find({
            //     keyword: { $in: keyword },
            //     _id: { $ne: currentProductId } // Exclude the current product by its ID
            // }).limit(6); // Limit the number of related products, if necessary

            return relatedProducts;
        } catch (error) {
            throw error;
        }
    };
    // async findRelatedProducts(keyword) {
    //     return await Product.aggregate([
    //         {
    //             $match: { keyword: keyword },
    //         },
    //         { $limit: 6 },
    //     ]);
    // }

    async updateProductStatus(productId, status) {
        return await Product.updateOne({ _id: productId }, { $set: { status: status } });
    }

    async updateProduct(productId, formData, imagePath, hasNewFile) {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        // Handle image update or replacement
        if (hasNewFile) {
            const currentImagePath = `./source/public${product.image}`; // Full path for server operations
            if (product.image !== "/img/products/default.png" && fs.existsSync(currentImagePath)) {
                fs.unlinkSync(currentImagePath); // Delete the existing image
            }
            formData.image = '/' + path.normalize(imagePath).replace(/\\/g, '/').replace('source/public/', '');
        } else if (product.image === "\\img\\products\\default.png") {
            formData.image = "/img/products/default.png";
        }

        formData.status = "Pending"; // Default to 'Pending' for all updates
        await Product.updateOne({ _id: productId }, formData);
    }

    async deleteProduct(productId) {
        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        if (product.image !== "/img/products/default.png") {
            const imagePath = `./source/public${product.image}`;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        await Product.deleteOne({ _id: productId });
    }

    async findAllProductsPaginated(page, limit, searchQuery, statusFilter) {
        let productsQuery = Product.find().populate("idAccount").sort({ time: -1 });

        let queryConditions = [];
        if (searchQuery) {
            const regex = new RegExp(searchQuery, 'i'); // Case-insensitive search
            queryConditions.push({ name: { $regex: regex } });
        }
        if (statusFilter) {
            queryConditions.push({ status: statusFilter });
        }

        if (queryConditions.length > 0) {
            productsQuery = productsQuery.find({ $and: queryConditions });
        }

        productsQuery = productsQuery.skip((page - 1) * limit).limit(limit);
        return await productsQuery.exec();
    }

    // async findAllProductsPaginated(page, limit) {
    //     return await Product.find()
    //         .populate("idAccount")
    //         .sort({ time: -1 })
    //         .skip((page - 1) * limit)
    //         .limit(limit);
    // }
    // async findAllProductsPaginated(page, limit, searchQuery) {
    //     let productsQuery = Product.find().populate("idAccount").sort({ time: -1 });

    //     // Apply search query filter if provided
    //     if (searchQuery) {
    //         const regex = new RegExp(searchQuery, 'i'); // Case-insensitive search
    //         productsQuery = productsQuery.find({
    //             $or: [
    //                 { name: { $regex: regex } }, // Filter by name
    //                 // { description: { $regex: regex } }, // Filter by description
    //                 // { keyword: { $in: [searchQuery] } } // Filter by keyword
    //             ]
    //         });
    //     }

    //     // Apply pagination
    //     productsQuery = productsQuery.skip((page - 1) * limit).limit(limit);

    //     // Execute the query
    //     const products = await productsQuery.exec();

    //     return products;
    // }     

    async countAllProducts(searchQuery, statusFilter) {
        let countQuery = Product.find();

        let queryConditions = [];
        if (searchQuery) {
            const regex = new RegExp(searchQuery, 'i'); // Case-insensitive search
            queryConditions.push({ name: { $regex: regex } });
        }
        if (statusFilter) {
            queryConditions.push({ status: statusFilter });
        }

        if (queryConditions.length > 0) {
            countQuery = countQuery.find({ $and: queryConditions });
        }

        return await countQuery.countDocuments();
    }
    // async countAllProducts(searchQuery) {
    //     let countQuery = Product.find();

    //     // Apply search query filter if provided
    //     if (searchQuery) {
    //         const regex = new RegExp(searchQuery, 'i'); // Case-insensitive search
    //         countQuery = countQuery.find({
    //             $or: [
    //                 { name: { $regex: regex } }, // Filter by name
    //                 // { description: { $regex: regex } }, // Filter by description
    //                 // { keyword: { $in: [searchQuery] } } // Filter by keyword
    //             ]
    //         });
    //     }

    //     // Execute the query and count the documents
    //     const count = await countQuery.countDocuments();

    //     return count;
    // }

    async findBannedProductsPaginated(page, limit) {
        return await Product.find({ status: "Banned" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countBannedProducts() {
        return await Product.find({ status: "Banned" }).countDocuments();
    }

    async findPendingProductsPaginated(page, limit) {
        return await Product.find({ status: "Pending" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countPendingProducts() {
        return await Product.find({ status: "Pending" }).countDocuments();
    }

    async findReportedProductsPaginated(page, limit) {
        return await Product.find({ status: "Reported" })
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countReportedProducts() {
        return await Product.find({ status: "Reported" }).countDocuments();
    }

    async findTrendingProductsPaginated(page, limit) {
        const criteria = {
            $or: [{ status: "Available", isTrend: true }, { status: "Trending" }]
        };
        return await Product.find(criteria)
            .populate("idAccount")
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countTrendingProducts() {
        const criteria = {
            $or: [{ status: "Available", isTrend: true }, { status: "Trending" }]
        };
        return await Product.find(criteria).countDocuments();
    }

    async updateProductStatusById(productId, actionType) {
        const product = await Product.findById(productId);
        switch (actionType) {
            case "ban":
            case "deny":
                product.status = "Banned";
                break;
            case "unban":
            case "remove":
            case "accept":
                product.status = "Available";
                break;
            case "acptrend":
                product.status = "Available";
                product.isTrend = true;
                break;
            case "denytrend":
                product.status = "Pending";
                product.isTrend = false;
                break;
            default:
                product.status = "Available"; // Default to Available if unspecified
                break;
        }
        return await product.save();
    }

    async findProductsByAccountAndFilters(idAccount, keyword, category, sortBy, page, limit) {
        let options = {
            idAccount: idAccount,
            $or: [{ status: "Available" }, { status: "Reported" }]
        };

        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            options.name = regex;
        }

        if (category) {
            options.category = category;
        }

        const products = await Product.find(options)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sortBy);

        const numberOfItems = await Product.countDocuments(options);

        return { products, numberOfItems };
    }

    async createProduct(productData) {
        const newProduct = new Product(productData);
        await newProduct.save();
        return newProduct;
    }

    async findPaginatedProducts(options, page, limit) {
        const products = await Product.find(options)
            .skip((page - 1) * limit)
            .limit(limit);
        return products;
    }

    async aggregateProductCategories(statuses) {
        return await Product.aggregate([
            { $match: { status: { $in: statuses } } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
    }

    async countProducts(options) {
        return await Product.find(options).countDocuments();
    }

    async findFilteredProducts(options, page, limit) {
        return await Product.find(options)
            .skip((page - 1) * limit)
            .limit(limit);
    }

    async countFilteredProducts(options) {
        return await Product.find(options).countDocuments();
    }

    async aggregateCategoriesByStatus(statuses) {
        return await Product.aggregate([
            { $match: { status: { $in: statuses } } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
    }

    async getProductById(productId) {
        const product = await Product.findById(productId);
        return product;
    }

    async updateProductStock(productId, quantity) {
        const product = await this.getProductById(productId);
        product.stock -= quantity;
        await product.save();
        return product.stock;
    }

    async findTrendingProducts(limit = 6) {
        return await Product.find({
            isTrend: true,
            $or: [{ status: "Available" }, { status: "Reported" }],
        })
            .limit(limit)
            .sort("timestamps: -1");
    }

    async getProductWithAccount(productId) {
        const product = await Product.findOne({ _id: productId }).populate("idAccount");
        return product;
    }

}

module.exports = new ProductRepository();
