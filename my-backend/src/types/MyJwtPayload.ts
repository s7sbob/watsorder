import { JwtPayload } from 'jsonwebtoken'

// تشكل الحقول التي تخزنها فعليًا في التوكن
export interface MyJwtPayload extends JwtPayload {
  id: number
  subscriptionType: string
  username: string
  // إلخ
}
