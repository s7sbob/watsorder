// src/services/whatsapp/customerInfo.ts

import { poolPromise } from '../../config/db2'; // أو db حسب ما عندك
import * as sql from 'mssql';

/**
 * استرجاع الاسم المسجل لرقم الهاتف في جلسة معيّنة
 */
export const getCustomerName = async (
  sessionId: number,
  customerPhone: string
): Promise<string | null> => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT name
      FROM CustomerInfo
      WHERE sessionId = @sessionId
        AND phoneNumber = @custPhone
    `);

  if (result.recordset.length > 0) {
    return result.recordset[0].name;
  }
  return null;
};

/**
 * حفظ أو تحديث اسم العميل لرقم هاتف في جلسة معيّنة
 */
export const saveCustomerName = async (
  sessionId: number,
  customerPhone: string,
  name: string
): Promise<void> => {
  const pool = await poolPromise;

  // هل يوجد سجل قديم؟
  const check = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT phoneNumber
      FROM CustomerInfo
      WHERE sessionId = @sessionId
        AND phoneNumber = @custPhone
    `);

  if (check.recordset.length > 0) {
    // نعمل تحديث
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('custPhone', sql.NVarChar, customerPhone)
      .input('name', sql.NVarChar, name)
      .query(`
        UPDATE CustomerInfo
        SET name = @name,
            updatedAt = GETDATE()
        WHERE sessionId = @sessionId
          AND phoneNumber = @custPhone
      `);
  } else {
    // سجل جديد
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('custPhone', sql.NVarChar, customerPhone)
      .input('name', sql.NVarChar, name)
      .query(`
        INSERT INTO CustomerInfo (sessionId, phoneNumber, name, updatedAt)
        VALUES (@sessionId, @custPhone, @name, GETDATE())
      `);
  }
};

/**
 * استرجاع العناوين المسجلة للعميل (حسب الجلسة)
 */
export const getCustomerAddresses = async (
  sessionId: number,
  customerPhone: string
): Promise<{ id: number; address: string }[]> => {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`
      SELECT id, address
      FROM CustomerAddresses
      WHERE sessionId = @sessionId
        AND phoneNumber = @custPhone
      ORDER BY id ASC
    `);

  return result.recordset; // يرجع مصفوفة من { id, address }
};

/**
 * حفظ عنوان جديد
 */
export const saveCustomerAddress = async (
  sessionId: number,
  customerPhone: string,
  address: string
): Promise<void> => {
  const pool = await poolPromise;
  await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .input('custPhone', sql.NVarChar, customerPhone)
    .input('address', sql.NVarChar, address)
    .query(`
      INSERT INTO CustomerAddresses (sessionId, phoneNumber, address)
      VALUES (@sessionId, @custPhone, @address)
    `);
};
