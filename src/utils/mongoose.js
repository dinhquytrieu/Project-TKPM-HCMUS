module.exports = {
  mutipleMongooseToObject: (mongooses) => {
    if (!Array.isArray(mongooses)) {
      console.log("Expected an array, received:", mongooses);
      return [];  // Or handle the case as appropriate
    }
    return mongooses.map((mongoose) => mongoose.toObject());
  },
  mongooseToObject: (mongoose) => {
    return mongoose ? mongoose.toObject() : mongoose;
  },
};
