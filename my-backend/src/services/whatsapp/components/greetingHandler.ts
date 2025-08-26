import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import WhatsAppMessageFormatter from '../../../utils/whatsappMessageFormatter';

interface GreetingHandlerParams {
  client: Client;
  msg: Message;
  upperText: string;
  pool: any;
  sessionId: number;
  customerPhone: string;
  greetingActive: boolean;
  greetingMessage: string;
  phoneNumber: string;
  menuBotActive: boolean;
}

export const handleGreeting = async ({
  client,
  msg,
  upperText,
  pool,
  sessionId,
  customerPhone,
  greetingActive,
  greetingMessage,
  phoneNumber,
  menuBotActive
}: GreetingHandlerParams): Promise<void> => {
  
  // تعريف ما إذا كانت الرسالة عبارة عن أمر
  const isCommand =
    ['NEWORDER', 'SHOWCATEGORIES', 'VIEWCART', 'CARTCONFIRM'].some(cmd => upperText === cmd) ||
    upperText.startsWith('CATEGORY_') ||
    upperText.startsWith('PRODUCT_') ||
    upperText.startsWith('REMOVEPRODUCT_');

  // حالة الترحيب العامة (عند عدم كون الرسالة أمر)
  if (greetingActive && !isCommand) {
    console.log(`[${new Date().toISOString()}] Processing greeting for customer: ${customerPhone}`);
    
    // التحقق من وجود طلب نشط للعميل
    const existingOrder = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('custPhone', sql.NVarChar, customerPhone)
      .query(`
        SELECT TOP 1 id 
        FROM Orders 
        WHERE sessionId = @sessionId 
          AND customerPhoneNumber = @custPhone
          AND status IN ('IN_CART','AWAITING_ADDRESS','AWAITING_LOCATION','AWAITING_QUANTITY','AWAITING_NAME')
      `);

    // إرسال رسالة الترحيب فقط إذا لم يكن هناك طلب نشط
    if (existingOrder.recordset.length === 0) {
      try {
        // التحقق من وجود رسالة ترحيب
        if (greetingMessage && greetingMessage.trim()) {
          console.log(`[${new Date().toISOString()}] Sending formatted greeting message`);
          
          // رسالة الترحيب مُحفوظة بالفعل بتنسيق WhatsApp، لذا نرسلها مباشرة
          let formattedGreeting = greetingMessage;
          
          // إضافة معلومات إضافية للرسالة
          formattedGreeting = WhatsAppMessageFormatter.addMetadata(formattedGreeting, {
            timestamp: new Date(),
            sessionName: undefined // يمكن إضافة اسم الجلسة هنا إذا كان متاحاً
          });
          
          // إرسال رسالة الترحيب
          await sendMessageWithRetry(client, msg.from, formattedGreeting);
          
          console.log(`[${new Date().toISOString()}] Greeting message sent successfully`);
        } else {
          console.log(`[${new Date().toISOString()}] No greeting message configured for session ${sessionId}`);
        }
        
        // إرسال قائمة الأوامر إذا كان Menu Bot مفعل
        if (menuBotActive) {
          await sendMenuCommands(client, msg.from, phoneNumber);
        }
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending greeting message:`, error);
        
        // إرسال رسالة ترحيب بديلة في حالة الخطأ
        try {
          const fallbackGreeting = `مرحباً بك! 👋\n\nنحن سعداء لتواصلك معنا.`;
          await sendMessageWithRetry(client, msg.from, fallbackGreeting);
        } catch (fallbackError) {
          console.error(`[${new Date().toISOString()}] Failed to send fallback greeting:`, fallbackError);
        }
      }
    } else {
      console.log(`[${new Date().toISOString()}] Customer ${customerPhone} has active order, skipping greeting`);
    }
  } else if (!greetingActive) {
    console.log(`[${new Date().toISOString()}] Greeting is disabled for session ${sessionId}`);
  } else {
    console.log(`[${new Date().toISOString()}] Message is a command, skipping greeting`);
  }
};

/**
 * إرسال قائمة الأوامر المتاحة
 */
const sendMenuCommands = async (client: Client, chatId: string, phoneNumber: string): Promise<void> => {
  try {
    const menuMessage = `
📋 *الأوامر المتاحة:*

🛒 *NEWORDER* - بدء طلب جديد
📂 *SHOWCATEGORIES* - عرض الفئات
🛍️ *VIEWCART* - عرض السلة
✅ *CARTCONFIRM* - تأكيد الطلب

📞 للاستفسارات: ${phoneNumber || 'اتصل بنا'}

_أرسل أي من الأوامر أعلاه للبدء_
    `.trim();
    
    await sendMessageWithRetry(client, chatId, menuMessage);
    console.log(`[${new Date().toISOString()}] Menu commands sent successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending menu commands:`, error);
  }
};

/**
 * دالة مساعدة لإرسال رسالة مع إعادة المحاولة في حالة الفشل
 */
const sendMessageWithRetry = async (
  client: Client, 
  chatId: string, 
  message: string, 
  maxRetries: number = 3
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(chatId, message);
      console.log(`[${new Date().toISOString()}] Message sent successfully on attempt ${attempt}`);
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send message on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        // انتظار متزايد بين المحاولات
        const delay = attempt * 1000;
        console.log(`[${new Date().toISOString()}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[${new Date().toISOString()}] Failed to send message after ${maxRetries} attempts`);
  return false;
};

/**
 * دالة مساعدة للحصول على اسم العميل من رقم الهاتف
 */
const getCustomerDisplayName = async (pool: any, sessionId: number, customerPhone: string): Promise<string> => {
  try {
    const customerResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('customerPhone', sql.NVarChar, customerPhone)
      .query(`
        SELECT customerName 
        FROM CustomerInfo 
        WHERE sessionId = @sessionId AND customerPhone = @customerPhone
      `);
    
    if (customerResult.recordset.length > 0 && customerResult.recordset[0].customerName) {
      return customerResult.recordset[0].customerName;
    }
    
    // إذا لم يكن هناك اسم محفوظ، استخدم جزء من رقم الهاتف
    return `عميل ${customerPhone.slice(-4)}`;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error getting customer name:`, error);
    return `عميل ${customerPhone.slice(-4)}`;
  }
};

/**
 * دالة مساعدة لحفظ تفاعل العميل مع رسالة الترحيب
 */
const logGreetingInteraction = async (
  pool: any, 
  sessionId: number, 
  customerPhone: string, 
  messageType: 'greeting' | 'menu'
): Promise<void> => {
  try {
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('customerPhone', sql.NVarChar, customerPhone)
      .input('messageType', sql.NVarChar, messageType)
      .input('timestamp', sql.DateTime, new Date())
      .query(`
        INSERT INTO CustomerInteractions (sessionId, customerPhone, messageType, timestamp)
        VALUES (@sessionId, @customerPhone, @messageType, @timestamp)
      `);
    
    console.log(`[${new Date().toISOString()}] Logged ${messageType} interaction for customer ${customerPhone}`);
  } catch (error) {
    // لا نريد أن يؤثر خطأ في التسجيل على إرسال الرسالة
    console.error(`[${new Date().toISOString()}] Error logging interaction:`, error);
  }
};

