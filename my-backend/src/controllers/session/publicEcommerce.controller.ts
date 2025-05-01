import { Request, Response } from 'express'
import { poolPromise } from '../../config/db'
import * as sql from 'mssql'

/**
 * Lookup a live store by its display name (case‐insensitive, trimmed).
 */
async function findSessionByName(storeName: string) {
  const pool = await poolPromise
  const cleanName = storeName.trim().toLowerCase()
  const { recordset } = await pool.request()
    .input('name', sql.NVarChar, cleanName)
    .query(`
      SELECT id
      FROM Sessions
      WHERE LOWER(RTRIM(LTRIM(sessionDisplayName))) = @name
        AND ecommerceActive = 1
        AND status = 'Ready'
    `)
  return recordset[0]?.id || null
}

export const getPublicEcommerce = async (req: Request, res: Response) => {
  const { storeName } = req.params
  try {
    const sessionId = await findSessionByName(storeName)
    if (!sessionId) {
      return res.status(404).json({ message: 'Store not found or inactive.' })
    }

    const pool = await poolPromise
    const { recordset } = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT sessionDisplayName AS name,
               sessionAbout       AS about,
               sessionLogo        AS logo
        FROM Sessions
        WHERE id = @sessionId
      `)

    return res.json(recordset[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

export const getPublicCategories = async (req: Request, res: Response) => {
  const { storeName } = req.params
  try {
    const sessionId = await findSessionByName(storeName)
    if (!sessionId) {
      return res.status(404).json({ message: 'Store not found.' })
    }

    const pool = await poolPromise
    const { recordset } = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT category_name
        FROM Categories
        WHERE sessionId = @sessionId
        ORDER BY [order] ASC
      `)

    return res.json(recordset.map(r => r.category_name))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Server error' })
  }
}

export const getPublicProducts = async (req: Request, res: Response) => {
  const { storeName } = req.params;
  try {
    const sessionId = await findSessionByName(storeName);
    if (!sessionId) {
      return res.status(404).json({ message: 'Store not found.' });
    }

    const pool = await poolPromise;
    const { recordset } = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        SELECT p.id,
               p.product_name  AS name,
               p.price,
               p.productPhoto  AS photo,
               c.category_name AS category,      -- ✅
               p.productDescription AS description
        FROM   Products   p
        JOIN   Categories c ON c.id = p.category_id
        WHERE  p.sessionId   = @sessionId
          AND  p.isActive    = 1
          AND  p.isEcommerce = 1
        ORDER BY p.[order] ASC
      `);

    return res.json(recordset);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
