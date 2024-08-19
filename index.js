const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
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

    // Add New User:
    app.post("/addUser", async (req, res) => {
      const { name, email, phoneNumber, referenceId } = req.body;
      console.log(name, email, phoneNumber, referenceId);
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

    // Post for buy:
    app.post("/buy", async (req, res) => {
      const body = req.body;
      console.log(body);
    });

    // Load Buy and Sell Rate:
    app.get("/buy-sell-rate", async (req, res) => {
      const cursor = buySellRateCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });
    // Update Gold Rate:
app.put('/buy-sell-rate/:id', async (req, res) => {
  const { id } = req.params;
  const { userBuyRate, userSellRate, deliveryCharge } = req.body;

  try {
    const updatedRate = await buySellRateCollection.updateOne(
      { _id: new ObjectId(id) }, // Convert string ID to MongoDB ObjectId
      { $set: { userBuyRate, userSellRate, deliveryCharge } }, // Use $set to specify the fields to update
      { upsert: false } // Do not insert if the document does not exist
    );

    if (updatedRate.matchedCount === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Fetch and return the updated document
    const updatedDocument = await buySellRateCollection.findOne({ _id: new ObjectId(id) });
    res.status(200).json(updatedDocument);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ message: 'Internal Server Error' });
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
