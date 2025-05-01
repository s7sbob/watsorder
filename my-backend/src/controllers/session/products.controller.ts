import { Request, Response } from 'express';
import { poolPromise } from '../../config/db';
import * as sql from 'mssql';
import { checkSessionOwnership } from '../../utils/sessionUserChecks';
import path from 'path';

/**
 * إضافة منتج جديد (with optional photo, productDescription, isEcommerce)
 */
export const addProduct = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10); // أخذ sessionId من المسار
    const { category_id, product_name, productDescription, price, isActive, isEcommerce } = req.body;
    let productPhoto = null;

    // إذا تم رفع صورة جديدة، خزن مسار S3
    if (req.file) {
      productPhoto = (req.file as any).location; // مؤقتًا حتى يتم تطبيق ملف التصريح
    }

    // التحقق من أن sessionId ليس NaN
    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid sessionId in URL path' });
    }

    const result = await pool.request()
      .input('sessionId', sessionId)
      .input('category_id', category_id)
      .input('product_name', product_name)
      .input('productDescription', productDescription)
      .input('price', price)
      .input('productPhoto', productPhoto)
      .input('isActive', isActive === 'true' ? 1 : 0)
      .input('isEcommerce', isEcommerce === 'true' ? 1 : 0)
      .query(`
        INSERT INTO Products (SessionId, category_id, product_name, productDescription, Price, productPhoto, IsActive, IsEcommerce)
        VALUES (@sessionId, @category_id, @product_name, @productDescription, @price, @productPhoto, @isActive, @isEcommerce);
        SELECT SCOPE_IDENTITY() as id;
      `);

    res.status(201).json({ id: result.recordset[0].id, message: 'Product added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding product' });
  }
};

/**
 * جلب المنتجات مع الحقول الجديدة
 */
export const getProductsForSession = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  try {
    const pool = await poolPromise
    await checkSessionOwnership(pool, sessionId, req.user)

    const result = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT
          id,
          product_name,
          category_id,
          price,
          isActive,
          [order],
          productPhoto,
          productDescription,
          isEcommerce
        FROM Products
        WHERE sessionId = @sessionId
      `)

    return res.status(200).json(result.recordset)
  } catch (error: any) {
    console.error('Error fetching products:', error)
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    return res.status(500).json({ message: 'Error fetching products.' })
  }
}

/**
 * تعديل منتج موجود (including new fields + optional new photo)
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const pool      = await poolPromise;
    const sessionId = parseInt(req.params.sessionId, 10);
    const productId = parseInt(req.params.productId, 10);   // ✅ المعرّف الصحيح

    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid productId in URL path' });
    }

    const {
      product_name,
      productDescription,
      price,
      isActive,
      isEcommerce,
      order,
    } = req.body;

    /* التقاط الصورة (إن وُجدت) */
    let productPhoto: string | null = null;
    if (req.file) {
      productPhoto = (req.file as any).location;
    } else if (req.files && Array.isArray(req.files) && req.files.length) {
      productPhoto = (req.files[0] as any).location;
    }

    /* تجهيز الحقول */
    const fields: string[] = [];
    const reqSQL = pool.request()
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId);

    if (product_name)          { fields.push('product_name   = @product_name');   reqSQL.input('product_name',          product_name); }
    if (productDescription)    { fields.push('productDescription = @productDescription'); reqSQL.input('productDescription', productDescription); }
    if (price)                 { fields.push('Price          = @price');          reqSQL.input('price',                 price); }
    if (order !== undefined)   { fields.push('[order]        = @order');          reqSQL.input('order',                 +order); }
    if (productPhoto)          { fields.push('productPhoto   = @productPhoto');   reqSQL.input('productPhoto',          productPhoto); }
    if (isActive !== undefined){ fields.push('IsActive       = @isActive');       reqSQL.input('isActive',  isActive === 'true' ? 1 : 0); }
    if (isEcommerce !== undefined){ fields.push('IsEcommerce = @isEcommerce');    reqSQL.input('isEcommerce', isEcommerce === 'true' ? 1 : 0); }

    if (!fields.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    /* تنفيذ التعديل */
    const result = await reqSQL.query(`
      UPDATE Products
      SET ${fields.join(', ')}
      WHERE Id = @productId AND SessionId = @sessionId
    `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Product not found for this session' });
    }

    return res.json({ message: 'Product updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error updating product' });
  }
};



/**
 * حذف منتج
 */
export const deleteProduct = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const productId = parseInt(req.params.productId, 10)
  try {
    const pool = await poolPromise
    await checkSessionOwnership(pool, sessionId, req.user)

    await pool.request()
      .input('productId', sql.Int, productId)
      .input('sessionId', sql.Int, sessionId)
      .query(`
        DELETE FROM Products
        WHERE id = @productId AND sessionId = @sessionId
      `)

    return res.status(200).json({ message: 'Product deleted successfully.' })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    if (error.message === 'Forbidden') {
      return res.status(403).json({ message: 'Forbidden: You do not own this session.' })
    }
    if (error.message === 'SessionNotFound') {
      return res.status(404).json({ message: 'Session not found.' })
    }
    return res.status(500).json({ message: 'Error deleting product.' })
  }
}

/**
 * إعادة ترتيب المنتجات
 */
export const reorderProducts = async (req: Request, res: Response) => {
  const sessionId = parseInt(req.params.sessionId, 10)
  const { products } = req.body // array of { id, order }

  if (!Array.isArray(products)) {
    return res.status(400).json({ message: 'Invalid products data.' })
  }

  try {
    const pool = await poolPromise
    await checkSessionOwnership(pool, sessionId, req.user)

    for (const prod of products) {
      await pool.request()
        .input('id', sql.Int, prod.id)
        .input('order', sql.Int, prod.order)
        .input('sessionId', sql.Int, sessionId)
        .query(`
          UPDATE Products
          SET [order] = @order
          WHERE id = @id AND sessionId = @sessionId
        `)
    }

    return res.status(200).json({ message: 'Products reordered successfully.' })
  } catch (error: any) {
    console.error('Error reordering products:', error)
    return res.status(500).json({ message: 'Error reordering products.' })
  }
}
