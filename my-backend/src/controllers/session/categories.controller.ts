import { Request, Response } from 'express';
import { getConnection } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnershipForCatProd } from './helpers';

export const addCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { category_name, isActive = true, order = 0 } = req.body;

  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user);

    const insertSQL = `
      INSERT INTO [dbo].[Categories] (sessionId, category_name, isActive, [order])
      VALUES (@sessionId, @category_name, @isActive, @order)
    `;
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('category_name', sql.NVarChar, category_name)
      .input('isActive', sql.Bit, isActive)
      .input('order', sql.Int, order)
      .query(insertSQL);

    return res.status(201).json({ message: 'Category added successfully.' });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    console.error('Error adding category:', error);
    return res.status(500).json({ message: 'Error adding category.' });
  }
};

export const getCategoriesForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  try {
    const pool = await getConnection();
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user);

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT id, category_name, isActive, [order]
        FROM [dbo].[Categories]
        WHERE sessionId = @sessionId
      `);

    return res.status(200).json(result.recordset);
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Error fetching categories.' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const categoryId = parseInt(req.params.categoryId, 10);
  const { category_name, isActive, order } = req.body;

  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required.' });
  }
  try {
    const pool = await getConnection();
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user);

    const updateSQL = `
      UPDATE [dbo].[Categories]
      SET category_name = @category_name,
          isActive = @isActive,
          [order] = @order
      WHERE id = @categoryId AND sessionId = @sessionId
    `;
    await pool.request()
      .input('category_name', sql.NVarChar, category_name)
      .input('isActive', sql.Bit, isActive)
      .input('order', sql.Int, order)
      .input('categoryId', sql.Int, categoryId)
      .input('sessionId', sql.Int, sessionId)
      .query(updateSQL);

    return res.status(200).json({ message: 'Category updated successfully.' });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    console.error('Error updating category:', error);
    return res.status(500).json({ message: 'Error updating category.' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const categoryId = parseInt(req.params.categoryId, 10);
  try {
    const pool = await getConnection();
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user);

    const deleteSQL = `
      DELETE FROM [dbo].[Categories]
      WHERE id = @categoryId AND sessionId = @sessionId
    `;
    await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .input('sessionId', sql.Int, sessionId)
      .query(deleteSQL);

    return res.status(200).json({ message: 'Category deleted successfully.' });
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' });
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' });
    }
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Error deleting category.' });
  }
};


export const reorderCategories = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const { categories } = req.body; // نتوقع إن body يحتوي على مصفوفة من التصنيفات مع id و order

  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({ message: 'Invalid categories data.' });
  }

  try {
    const pool = await getConnection();
    await checkSessionOwnershipForCatProd(pool, sessionId, req.user);

    for (const cat of categories) {
      await pool.request()
        .input('id', sql.Int, cat.id)
        .input('order', sql.Int, cat.order)
        .input('sessionId', sql.Int, sessionId)
        .query(`UPDATE [dbo].[Categories] SET [order] = @order WHERE id = @id AND sessionId = @sessionId`);
    }

    return res.status(200).json({ message: 'Categories reordered successfully.' });
  } catch (error: any) {
    console.error('Error reordering categories:', error);
    return res.status(500).json({ message: 'Error reordering categories.' });
  }
};
