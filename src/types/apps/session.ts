// src/types/apps/session.ts
export interface SessionType {
  id: number; // المعرف الفريد للجلسة
  sessionIdentifier: string; // معرّف الجلسة الفريد (مثل username.subscriptionType.sessionId)
  phoneNumber: string; // رقم الهاتف المرتبط بالجلسة
  status: 'Active' | 'Inactive' | 'Waiting for QR Code'; // حالة الجلسة
  userId: number; // المعرف الفريد للمستخدم المرتبط بالجلسة
  subscriptionType: string; // نوع الاشتراك المرتبط بالمستخدم (مثل Free, Regular, Premium, Admin)
  createdAt: string; // تاريخ إنشاء الجلسة
  updatedAt: string; // تاريخ آخر تحديث للجلسة
  // يمكن إضافة حقول إضافية إذا لزم الأمر
}
