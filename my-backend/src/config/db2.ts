// my-backend\src\config\db.ts
import dotenv from 'dotenv';
import * as sql from 'mssql';  // تعديل هنا
dotenv.config();

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);

// تأكد من وجود جميع المتغيرات البيئية المطلوبة
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_SERVER || !process.env.DB_DATABASE) {
  throw new Error('Missing one or more required environment variables for database connection.');
}

// إعدادات الاتصال بقاعدة البيانات مع ضبط خيارات pool
const dbConfig: sql.config = {
  user: process.env.DB_USER as string,
  password: process.env.DB_PASSWORD as string,
  server: process.env.DB_SERVER as string,
  database: process.env.DB_DATABASE as string,
  options: {
    encrypt: false, // اضبطه حسب إعدادات الخادم
    trustServerCertificate: true,
  },
  pool: {
    max: 10,                 // أقصى عدد من الاتصالات
    min: 0,
    idleTimeoutMillis: 30000 // انتهاء الاتصال بعد 30 ثانية من عدم النشاط
  }
};

// إنشاء الـ pool عند بدء تشغيل التطبيق وإعادة استخدامه لكل الاستعلامات
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
  });

export { poolPromise };