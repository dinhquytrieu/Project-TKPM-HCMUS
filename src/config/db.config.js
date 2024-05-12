// Configuration for establishing a connection to a MongoDB database using Mongoose in a Node.js application. 
// It is structured as a module that can be reused to connect to the database from various parts of the application.

// While this module does not strictly implement the Singleton pattern (as it does not restrict the instantiation of itself to one instance), 
// it effectively enforces a single MongoDB connection throughout the application. The use of the module pattern here ensures that 
// every part of the application that requires a database connection will reuse the same connection initialized by this connect function. 

const mongoose = require('mongoose');
const dotenv = require('dotenv');

module.exports = {
  connect: () => {
    dotenv.config({ path: './config.env' });
    const DB = process.env.DATABASE.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );

    mongoose.connect(DB).then(() => console.log('DB connection successful!'));
  },
};
