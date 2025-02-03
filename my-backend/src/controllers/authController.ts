import { NextFunction, Request, Response } from 'express';
import { getConnection } from '../config/db';
import bcrypt from 'bcrypt';
import * as sql from 'mssql';
import jwt from 'jsonwebtoken';
import { MyJwtPayload } from '../types/MyJwtPayload' // واجهة تعرف حقولك الإضافية


export const registerUser = async (req: Request, res: Response): Promise<Response> => {
  const { username, password, subscriptionType, name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'يرجى ملء جميع الحقول' });
  }

  try {
    const pool = await getConnection();

    const checkUser = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('name', sql.NVarChar, name || null)
      .input('password', sql.NVarChar, hashedPassword)
      .input('subscriptionType', sql.NVarChar, subscriptionType || 'free')
      .query(
        'INSERT INTO Users (username, name, password, subscriptionType) VALUES (@username, @name, @password, @subscriptionType)'
      );

    return res.status(201).json({ message: 'تم التسجيل بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// تسجيل الدخول وإنشاء التوكين
export const loginUser = async (req: Request, res: Response): Promise<Response> => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'يرجى ملء جميع الحقول' });
  }

  try {
    const pool = await getConnection();

    // التحقق من وجود المستخدم
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    const user = result.recordset[0];

    if (!user) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // إنشاء التوكين وتضمين كل بيانات المستخدم
    const token = jwt.sign(
      {
        id: user.ID,
        username: user.username,
        subscriptionType: user.subscriptionType,
        name: user.name,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        createdAt: user.createdAt,
        maxSessions: user.maxSessions,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'تم تسجيل الدخول بنجاح', token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'خطأ في الخادم' });
  }
};

// فك تشفير التوكين
export const verifyToken = (req: Request, res: Response, next: NextFunction): Response | void => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(403).json({ message: 'التوكين غير موجود' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)

    // الآن decoded من نوع (string | JwtPayload)
    if (typeof decoded === 'string') {
      // لو أردت اعتباره خطأ:
      return res.status(401).json({ message: 'Invalid token payload (string).' })
    }

    // الآن decoded هو JwtPayload => حوله إلى MyJwtPayload
    const customPayload = decoded as MyJwtPayload
    req.user = customPayload

    next()
  } catch (err) {
    console.error('Token verification failed:', err)
    return res.status(401).json({ message: 'التوكين غير صالح' })
  }
}



