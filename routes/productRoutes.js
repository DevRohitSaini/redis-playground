import express from "express";
import Product from "../models/Product.js";
import redisClient from "../redis-server.js";
import { generateCacheKey } from "../config/utills.js";

const router = express.Router();

// Create Product
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Products
router.get("/", async (req, res) => {
  try {
    const key = generateCacheKey(req);

    const cachedProducts = await redisClient.get(key);

    if (cachedProducts) {
      console.log('Cache hit');
      return res.json(JSON.parse(cachedProducts));
    }

    console.log('Cache miss');

    const query = {};
    if (req.query.category) {
      query.category = req.query.category;
    }

    const products = await Product.find(query);

    if (products.length) {
      await client.set(key, JSON.stringify(products));
    }

    res.json(products);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(404).json({ error: "Product not found" });
  }
});

// Update Product
router.put("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const listCacheKey = 'api:products*';
    const keys = await client.keys(listCacheKey);
    if (keys.length > 0) {
        await client.del(keys);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
    });

  } catch (err) {
    res.status(404).json({ error: "Cannot update product" });
  }
});

// Delete Product
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(404).json({ error: "Cannot delete product" });
  }
});

export default router;
