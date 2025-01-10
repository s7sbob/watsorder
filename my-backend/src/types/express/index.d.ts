import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; // ضع النوع المناسب هنا بناءً على البيانات التي تمررها
    }
  }
}
