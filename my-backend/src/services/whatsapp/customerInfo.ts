// src/services/whatsapp/customerInfo.ts
import { getConnection } from '../../config/db';
import * as sql from 'mssql';

/**
 * استرجاع الاسم المسجل لرقم الهاتف (إن وجد)
 */
export const getCustomerName = async (customerPhone: string): Promise<string | null> => {
  const pool = await getConnection();
  const result = await pool.request()
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`SELECT name FROM CustomerInfo WHERE phoneNumber = @custPhone`);
  if (result.recordset.length) {
    return result.recordset[0].name;
  }
  return null;
};

/**
 * حفظ أو تحديث اسم العميل
 */
export const saveCustomerName = async (customerPhone: string, name: string): Promise<void> => {
  const pool = await getConnection();
  const result = await pool.request()
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`SELECT name FROM CustomerInfo WHERE phoneNumber = @custPhone`);
  if (result.recordset.length) {
    await pool.request()
      .input('custPhone', sql.NVarChar, customerPhone)
      .input('name', sql.NVarChar, name)
      .query(`UPDATE CustomerInfo SET name = @name WHERE phoneNumber = @custPhone`);
  } else {
    await pool.request()
      .input('custPhone', sql.NVarChar, customerPhone)
      .input('name', sql.NVarChar, name)
      .query(`INSERT INTO CustomerInfo (phoneNumber, name) VALUES (@custPhone, @name)`);
  }
};

/**
 * استرجاع العناوين المسجلة لرقم الهاتف
 */
export const getCustomerAddresses = async (customerPhone: string): Promise<{ id: number, address: string }[]> => {
  const pool = await getConnection();
  const result = await pool.request()
    .input('custPhone', sql.NVarChar, customerPhone)
    .query(`SELECT id, address FROM CustomerAddresses WHERE phoneNumber = @custPhone`);
  return result.recordset;
};

/**
 * حفظ عنوان جديد لرقم الهاتف
 */
export const saveCustomerAddress = async (customerPhone: string, address: string): Promise<void> => {
  const pool = await getConnection();
  await pool.request()
    .input('custPhone', sql.NVarChar, customerPhone)
    .input('address', sql.NVarChar, address)
    .query(`INSERT INTO CustomerAddresses (phoneNumber, address) VALUES (@custPhone, @address)`);
};
