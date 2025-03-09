// src/controllers/session/session.products.ts
import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';

async function checkSessionOwnershipForCatProd(pool: sql.ConnectionPool, sessionId: number, currentUser: any) {
  const sess = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT userId FROM Sessions WHERE id = @sessionId`)
  if (!sess.recordset.length) {
    throw new Error('SessionNotFound')
  }
  if (currentUser.subscriptionType !== 'admin' && currentUser.id !== sess.recordset[0].userId) {
    throw new Error('Forbidden')
  }}

export const addProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const insertSQL = `
      INSERT INTO [dbo].[Products] (sessionId, category_id, product_name, price)
      VALUES (@sessionId, @category_id, @product_name, @price)
    `
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_id', sql.Int, category_id)
      .input('product_name', sql.NVarChar, product_name)
      .input('price', sql.Decimal(18,2), price ?? null)
      .query(insertSQL)

    return res.status(201).json({ message: 'Product added successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error adding product:', error)
    return res.status(500).json({ message: 'Error adding product.' })
  }
};

export const getProductsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, product_name, category_id, price
        FROM [dbo].[Products]
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error fetching products:', error)
    return res.status(500).json({ message: 'Error fetching products.' })
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  const { product_name, category_id, price } = req.body

  if (!product_name || !category_id) {
    return res.status(400).json({ message: 'product_name and category_id are required.' })
  }

  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const updateSQL = `
      UPDATE [dbo].[Products]
      SET product_name = @product_name,
          category_id = @category_id,
          price = @price
      WHERE id = @productId
        AND sessionId = @sessionId
    `
    await pool.request()
      .input('product_name', sql.NVarChar, product_name)
      .input('category_id', sql.Int, category_id)
      .input('price', sql.Decimal(18,2), price ?? null)
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(updateSQL)

    return res.status(200).json({ message: 'Product updated successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error updating product:', error)
    return res.status(500).json({ message: 'Error updating product.' })
  }
}

export const deleteProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  try {
    const pool = await getConnection()
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user)

    const deleteSQL = `
      DELETE FROM [dbo].[Products]
      WHERE id = @productId AND sessionId = @sessionId
    `
    await pool.request()
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL)

    return res.status(200).json({ message: 'Product deleted successfully.' })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    console.error('Error deleting product:', error)
    return res.status(500).json({ message: 'Error deleting product.' })
  }
}