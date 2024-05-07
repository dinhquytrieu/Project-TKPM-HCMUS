const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://hcmusbookstore:hcmusbookstore4student@cluster0.9n6smha.mongodb.net/2handbook?retryWrites=true";  // Be sure to replace this with your actual connection string
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  if (err) {
    console.error('Database connection failed', err);
    return;
  }
  const collection = client.db("Cluster0").collection("products");
  // Get indexes
  collection.indexes().then(indexes => {
    console.log(indexes);
    client.close();
  }).catch(err => {
    console.error('Failed to retrieve indexes', err);
    client.close();
  });
});
