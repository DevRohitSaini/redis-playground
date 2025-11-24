import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import productRoutes from "./routes/productRoutes.js";
import redisClient from "./redis-server.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Redis client
redisClient.connect();
console.log("Connected to Redis!")

// Routes
app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
  res.send("Notes API is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
