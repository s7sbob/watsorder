// src/middleware/authMiddleware.ts

import jwt, { JwtPayload } from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

// 1) عرّف واجهة للـ JWT Payload، تشمل الحقول المضافة
interface MyJwtPayload extends JwtPayload {
  id: number
  username: string
  subscriptionType: string
  name?: string
  subscriptionStart?: string
  subscriptionEnd?: string
  createdAt?: string
  maxSessions?: number
}

// 2) توسعة Request بإضافة user من نوع MyJwtPayload
declare module 'express-serve-static-core' {
  interface Request {
    user?: MyJwtPayload
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access Denied. No token provided.' })
  }

  try {
    // 3) فك التوكن مع تحويله إلى MyJwtPayload
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as MyJwtPayload

    // إضافة بيانات المستخدم إلى req.user
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token.' })
  }
}
