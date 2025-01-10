import dotenv from 'dotenv';
import * as sql from 'mssql';  // تعديل هنا
dotenv.config();

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);

if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_SERVER || !process.env.DB_DATABASE) {
  throw new Error('Missing one or more required environment variables for database connection.');
}

const dbConfig: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_SERVER as string,
  database: process.env.DB_DATABASE as string,
  options: {
    encrypt: false, // اضبطه بناءً على إعداداتك
    trustServerCertificate: true,
  }
};

export async function getConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (error) {
    throw error;
  }
}
