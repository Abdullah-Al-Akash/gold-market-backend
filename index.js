const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware setup:
app.use(cors());
app.use(express.json());

// Main Part:
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mjssx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    // Load Database and Collection:
    const db = client.db("GoldMarket");
    const usersCollection = db.collection("users");
    const buySellRateCollection = db.collection("buySellRate");
    const businessCollection = db.collection("businessCollection");
    const adminReport = db.collection("adminReport");

    // Add New User:
    app.post("/addUser", async (req, res) => {
      const { name, email, phoneNumber, referenceId, myVault, nid } = req.body;
      
      try {
        // Check if the email already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already registered" });
        }

        // Create a new user document
        const newUser = {
          name,
          email,
          phoneNumber,
          referenceId,
          nid,
          myVault
        };

        // Insert the new user into the database
        const result = await usersCollection.insertOne(newUser);
        res.status(201).json({
          message: "User registered successfully",
          userId: result.insertedId,
        });
      } catch (err) {
        console.error("Error registering user:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    // Get All User:
    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find({});
      const result = await cursor.sort({ _id: -1 }).toArray();
      res.send(result);
    });
    // Get Current User Details:
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      try {
        // Find a single document matching the email
        const user = await usersCollection.findOne({ email: email });

        // Check if a user was found and send the response
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    // Post for buy:
    app.post("/buy", async (req, res) => {
      const body = req.body;

      try {
        // Assuming you want to insert the data into a MongoDB collection
        const result = await businessCollection.insertOne(body);

        // Send a success response with the inserted document ID
        res
          .status(201)
          .json({ message: "Buy operation successful", id: result.insertedId });
      } catch (error) {
        console.error("Error processing buy request:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Load Buy and Sell Rate:
    app.get("/buy-sell-rate", async (req, res) => {
      try {
        // Fetch the first document from the collection
        const rate = await buySellRateCollection.findOne();

        // Check if a document was found and send the response
        if (rate) {
          res.json(rate);
        } else {
          res.status(404).json({ message: "No rate found" });
        }
      } catch (error) {
        console.error("Error fetching buy-sell rate:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    // Update Gold Rate:
    app.put("/buy-sell-rate/:id", async (req, res) => {
      const { id } = req.params;
      const { userBuyRate, userSellRate, deliveryCharge } = req.body;

      try {
        const updatedRate = await buySellRateCollection.updateOne(
          { _id: new ObjectId(id) }, // Convert string ID to MongoDB ObjectId
          { $set: { userBuyRate, userSellRate, deliveryCharge } }, // Use $set to specify the fields to update
          { upsert: false } // Do not insert if the document does not exist
        );

        if (updatedRate.matchedCount === 0) {
          return res.status(404).json({ message: "Resource not found" });
        }

        // Fetch and return the updated document
        const updatedDocument = await buySellRateCollection.findOne({
          _id: new ObjectId(id),
        });
        res.status(200).json(updatedDocument);
      } catch (error) {
        console.error("Error updating resource:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Transaction History Individual:
    app.get("/transaction", async (req, res) => {
      const email = req.query.email;

      // Validate email input
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email query parameter is required" });
      }

      try {
        // Find documents matching the email
        const history = await businessCollection
          .find({ "CUser.email": email })
          .toArray();

        // Check if history was found and send the response
        if (history.length > 0) {
          res.json(history);
        } else {
          res
            .status(404)
            .json({ message: "No transactions found for this email" });
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // All Request/Transaction History
    app.get("/request", async (req, res) => {
      try {
        // Find documents matching the email
        const request = await businessCollection.find({}).sort({ _id: -1 }).toArray();

        // Check if history was found and send the response
        if (request.length > 0) {
          res.json(request);
        } else {
          res
            .status(404)
            .json({ message: "No transactions found for this email" });
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Approved Request:
    app.put("/request/:id", async (req, res) => {
      const { id } = req.params;
      const { status, requestType, amountInGm, amountInBdt, userId } = req.body;
      console.log(status, requestType, amountInGm, amountInBdt, userId);

      // Check if status is provided
      if (status === undefined) {
        return res.status(400).json({ message: "Status is required" });
      }

      try {
        // Update the status field of the specified item
        const result = await businessCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: status } }
        );
        // Update Amount of Gold in User Profile:
        if (requestType == "Buy") {
          const updateUserVault = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { myVault: amountInGm } } // Increment myVault by amountInGm
          );
          if (updateUserVault.matchedCount === 0) {
            return res.status(404).json({ message: "Item not found" });
          }
        }
        if (requestType == "Sell") {
          const user = await usersCollection.findOne({
            _id: new ObjectId(userId),
          });
          const currentVault = user?.myVault;

          // Step 2: Calculate the new value
          const newVaultValue = currentVault - amountInGm;

          // Step 3: Update the 'myVault' field with the new value
          const updateResult = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { myVault: newVaultValue } }
          );

          if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: "Item not found" });
          }
        }

        // Check if the item was found and updated
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Item not found" });
        }

        res.json({ message: "Status updated successfully" });
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get('/adminReport', async (req, res) => {
      try {
        // Fetch all documents from the 'users' collection
        const users = await usersCollection.find({}).toArray();
        
        // Calculate the sum of 'myVault' field
        const totalVault = users.reduce((sum, user) => sum + (user.myVault || 0), 0);
        
        // Send the sum as a JSON response
        res.json({ totalVault });
      } catch (error) {
        // Handle errors and send an appropriate response
        console.error('Error fetching users or calculating sum:', error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (err) {
    console.error(err);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Gold Market is Running!");
});

app.listen(port, () => {
  console.log(`Gold Market is Running on Port ${port}`);
});
