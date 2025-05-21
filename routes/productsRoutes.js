import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { prisma } from '../prisma.js';

const router = Router();

router.get('/category', authMiddleware, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server Error', details: error.message });
  }
});
router.post('/category', authMiddleware, async (req, res) => {
  const { name, icon } = req.body;
  try {
    const category = await prisma.category.create({
      data: {
        name,
        icon,
      },
    });
    res.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Server Error', details: error.message });
  }
});

router.patch('/category/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, icon } = req.body;

  try {
    const categoryExists = await prisma.category.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!categoryExists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: name || undefined,
        icon: icon || undefined,
      },
    });

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});

router.delete('/category/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/product/category/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId: parseInt(id, 10),
      },
      include: {
        category: true,
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

router.get('/product', authMiddleware, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

router.get('/product/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const products = await prisma.product.findUnique({
      where: {
        id: parseInt(id, 10)
      },
      include: {
        category: true,
      },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

router.patch('/product/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { categoryId, name, description, price, quantity, textContent } = req.body;

  try {
    const productExists = await prisma.product.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!productExists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: parseInt(categoryId, 10) },
      });
      if (!categoryExists) {
        return res.status(400).json({ error: 'Invalid category ID' });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: {
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        name: name || undefined,
        description: description || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        quantity: textContent.length,
        textContent: textContent || undefined,
      },
      include: {
        category: true,
      },
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
});

router.post('/product', authMiddleware, async (req, res) => {
  const { categoryId, name, description, price, textContent } = req.body;

  if (!categoryId || !name || !description || !price || !textContent || !Array.isArray(textContent)) {
    return res.status(400).json({ error: 'All fields are required, textContent must be an array' });
  }

  const categoryExists = await prisma.category.findUnique({
    where: { id: parseInt(categoryId, 10) },
  });
  if (!categoryExists) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        categoryId: parseInt(categoryId, 10),
        name,
        description,
        price: parseFloat(price),
        quantity: textContent.length,
        textContent, // Сохраняем массив строк
      },
      include: {
        category: true
      }
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Product name already exists' });
    }
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
});

router.delete('/product/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.delete({
      where: {
        id: parseInt(id, 10),
      },
    });
    res.status(200).json(product);
  } catch (error) {
    console.error('Error deleting product:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
});

export default router;