const mongoose = require("mongoose");

const dbUri = "mongodb://localhost:27017/polio"

const dbConnection = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            await mongoose.connect(dbUri);
            resolve()
        } catch (e) {
            console.log('error in connection', e)
            return reject(e)
        }
    })
}

async function connectToDatabase() {
    try {
      await mongoose.connect(dbUri);
      console.log('Connected to MongoDB ', dbUri);
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error; // Re-throw the error to be handled in the calling code
    }
  }

  async function disconnectFromDatabase() {
    try {
      await mongoose.connection.close();
      console.log('Connection closed');
    } catch (error) {
      console.error('Error closing connection:', error);
      throw error; // Re-throw the error to be handled in the calling code
    }
  }

// dbConnection()
//   .then(() => console.log('DB connected'))
//   .catch((err) => {
//     console.log("error in connection", err);
//     // console.log(`Data Base Connection Failed, ${err.message}`);
// });

module.exports = {connectToDatabase, disconnectFromDatabase};