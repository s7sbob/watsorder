// src/types/apps/session.ts
export interface SessionType {
  id: number; // المعرف الفريد للجلسة
  sessionIdentifier: string; // معرّف الجلسة الفريد (مثل username.subscriptionType.sessionId)
  phoneNumber: string; // رقم الهاتف المرتبط بالجلسة
  status: string; // حالة الجلسة
  userId: number; // المعرف الفريد للمستخدم المرتبط بالجلسة
  subscriptionType: string; // نوع الاشتراك المرتبط بالمستخدم (مثل Free, Regular, Premium, Admin)
  createdAt: string; // تاريخ إنشاء الجلسة
  updatedAt: string; // تاريخ آخر تحديث للجلسة
  qrCode?: string; // رمز QR الخاص بالجلسة (اختياري)
  greetingMessage?: string;    // رسالة الترحيب
  greetingActive?: boolean;    // حالة تفعيل رسالة الترحيب
  // يمكن إضافة حقول إضافية إذا لزم الأمر
    // حقل جديد لتفعيل أو إيقاف البوت
    botActive?: boolean
    
}
