import { Request, Response } from 'express';
import { poolPromise } from '../config/db';
import * as sql from 'mssql';
import { Parser } from 'json2csv';
import dayjs from 'dayjs';
import { getSessionById, getUserById, checkSessionOwnership } from '../utils/sessionUserChecks';





/**
 * إنشاء سجل اشتراك جديد في جدول SubscriptionRenewals بعد قيام العميل بالدفع
 * يُستدعى مثلاً فور رفع إثبات الدفع
 */
export const createSubscriptionRenewal = async (req: Request, res: Response) => {
  try {
    const { sessionId, planType, amountPaid } = req.body; // user-chosen plan
    if (!sessionId || !planType || !amountPaid) {
      return res.status(400).json({
        message: 'sessionId, planType, and amountPaid are required.'
      });
    }

    const pool = await poolPromise;

    // Use utility function to get session
    const session = await getSessionById(pool, sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }
    const userId = session.userId;

    // Use utility function to get user
    const user = await getUserById(pool, userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const userPhone = user.phoneNumber;

    // 3) ندرج السجل
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('phoneNumber', sql.NVarChar, userPhone) // رقم العميل
      .input('planType', sql.NVarChar, planType)     // اسم الخطة
      .input('amountPaid', sql.Decimal(18, 2), amountPaid)
      // renewalPeriod غير مطلوب هنا, سيُحدد لاحقًا من قبل الأدمن
      .query(`
        INSERT INTO SubscriptionRenewals
          (sessionId, phoneNumber, planType, amountPaid)
        VALUES (@sessionId, @phoneNumber, @planType, @amountPaid)
      `);

    return res.status(201).json({ message: 'Subscription renewal record created.' });
  } catch (error) {
    console.error('Error creating subscription renewal:', error);
    return res.status(500).json({ message: 'Error creating subscription renewal.' });
  }
};

  



/**
 * البحث عن الجلسات بناءً على رقم التليفون
 * GET /api/subscriptions/search/:phoneNumber
 */
export const searchSessionsByPhone = async (req: Request, res: Response) => {
  const { phoneNumber } = req.params;
  if (!phoneNumber) {
    return res.status(400).json({ message: 'رقم التليفون مطلوب.' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query(`SELECT * FROM Sessions WHERE phoneNumber = @phoneNumber`);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error searching sessions:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء البحث عن الجلسات.' });
  }
};

/**
 * تجديد الاشتراك لجلسة معينة
 * POST /api/subscriptions/renew
 * Body: { sessionId, renewalPeriod ('month'|'year'), amountPaid, newExpireDate (اختياري) }
 */
export const renewSubscription = async (req: Request, res: Response) => {
  const { sessionId, renewalPeriod, amountPaid, newExpireDate } = req.body;
  if (!sessionId || !renewalPeriod || !amountPaid) {
    return res.status(400).json({ message: 'يرجى تزويد sessionId, renewalPeriod, و amountPaid.' });
  }
  try {
    const pool = await poolPromise;
    // جلب بيانات الجلسة للتحقق منها واسترجاع expireDate والرقم
    const sessionResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT expireDate, phoneNumber FROM Sessions WHERE id = @sessionId`);
      
    if (sessionResult.recordset.length === 0) {
      return res.status(404).json({ message: 'الجلسة غير موجودة.' });
    }
    
    const currentSession = sessionResult.recordset[0];
    const currentExpireDate = currentSession.expireDate ? new Date(currentSession.expireDate) : new Date();
    let calculatedExpireDate: Date;
    
    // استخدام التاريخ المدخل يدويًا إذا وُفر، وإلا يتم الحساب بناءً على الفترة
    if (newExpireDate) {
      calculatedExpireDate = new Date(newExpireDate);
    } else {
      calculatedExpireDate = new Date(currentExpireDate);
      if (renewalPeriod === 'month') {
        calculatedExpireDate.setMonth(calculatedExpireDate.getMonth() + 1);
      } else if (renewalPeriod === 'year') {
        calculatedExpireDate.setFullYear(calculatedExpireDate.getFullYear() + 1);
      } else {
        return res.status(400).json({ message: 'renewalPeriod يجب أن يكون "month" أو "year".' });
      }
    }
    
    // تحديث تاريخ انتهاء الاشتراك في جدول Sessions
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('newExpireDate', sql.DateTime, calculatedExpireDate)
      .query(`UPDATE Sessions SET expireDate = @newExpireDate, status = 'Ready' WHERE id = @sessionId`);
      
    // تسجيل عملية تجديد الاشتراك في جدول SubscriptionRenewals
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('phoneNumber', sql.NVarChar, currentSession.phoneNumber)
      .input('renewalPeriod', sql.NVarChar, renewalPeriod)
      .input('amountPaid', sql.Decimal(18, 2), amountPaid)
      .input('newExpireDate', sql.DateTime, calculatedExpireDate)
      .query(`
        INSERT INTO SubscriptionRenewals (sessionId, phoneNumber, renewalPeriod, amountPaid, newExpireDate)
        VALUES (@sessionId, @phoneNumber, @renewalPeriod, @amountPaid, @newExpireDate)
      `);
      
    return res.status(200).json({ 
      message: 'تم تجديد الاشتراك بنجاح.',
      newExpireDate: calculatedExpireDate
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء تجديد الاشتراك.' });
  }
};

/**
 * جلب كافة سجلات تجديد الاشتراكات مع إمكانية فلترة النتائج وترتيبها
 * GET /api/subscriptions?phoneNumber=...&fromDate=...&toDate=...&sort=renewalDate_desc
 */
// export const getAllSubscriptionRenewals = async (req: Request, res: Response) => {
//   try {
//     const { phoneNumber, fromDate, toDate, sort } = req.query;
//     const pool = await getConnection();
//     let query = 'SELECT * FROM SubscriptionRenewals WHERE 1=1';
    
//     if (phoneNumber) {
//       query += ' AND phoneNumber = @phoneNumber';
//     }
//     if (fromDate) {
//       query += ' AND renewalDate >= @fromDate';
//     }
//     if (toDate) {
//       query += ' AND renewalDate <= @toDate';
//     }
//     // ترتيب النتائج
//     if (sort) {
//       query += ` ORDER BY renewalDate ${sort === 'renewalDate_desc' ? 'DESC' : 'ASC'}`;
//     } else {
//       query += ' ORDER BY renewalDate DESC';
//     }
    
//     const requestQuery = pool.request();
//     if (phoneNumber) {
//       requestQuery.input('phoneNumber', sql.NVarChar, phoneNumber as string);
//     }
//     if (fromDate) {
//       requestQuery.input('fromDate', sql.DateTime, new Date(fromDate as string));
//     }
//     if (toDate) {
//       requestQuery.input('toDate', sql.DateTime, new Date(toDate as string));
//     }
    
//     const result = await requestQuery.query(query);
//     return res.status(200).json(result.recordset);
//   } catch (error) {
//     console.error('Error fetching subscription renewals:', error);
//     return res.status(500).json({ message: 'حدث خطأ أثناء جلب سجل الاشتراكات.' });
//   }
// };

/**
 * تعديل سجل تجديد اشتراك موجود
 * PUT /api/subscriptions/:id
 * Body: { renewalPeriod, amountPaid, newExpireDate }
 */
export const updateSubscriptionRenewal = async (req: Request, res: Response) => {
  const { id } = req.params
  const { renewalPeriod, amountPaid, newExpireDate } = req.body

  if (!renewalPeriod || !amountPaid || !newExpireDate) {
    return res.status(400).json({
      message: 'renewalPeriod, amountPaid, and newExpireDate are required.'
    })
  }

  try {
    const pool = await poolPromise;

    // (1) جلب sessionId الفعلي من جدول SubscriptionRenewals
    const subResult = await pool.request()
      .input('id', sql.Int, +id)
      .query(`
        SELECT sessionId 
        FROM SubscriptionRenewals
        WHERE id = @id
      `)

    if (subResult.recordset.length === 0) {
      return res.status(404).json({ message: 'SubscriptionRenewal not found.' })
    }
    const sessionId = subResult.recordset[0].sessionId // ← رقم الجلسة

    // (2) تنفيذ استعلامَي UPDATE في دفعة واحدة (T-SQL Batch):
    //     1) تحديث الاشتراك (SubscriptionRenewals)
    //     2) تحديث الجلسة (Sessions)
    //     نضع status='Confirmed' فى الاثنين
    const statusValue = 'Ready'

    await pool.request()
      .input('id', sql.Int, +id) // رقم السجل في SubscriptionRenewals
      .input('sessionId', sql.Int, sessionId) // رقم الجلسة
      .input('renewalPeriod', sql.NVarChar, renewalPeriod)
      .input('amountPaid', sql.Decimal(18, 2), amountPaid)
      .input('newExpireDate', sql.DateTime, new Date(newExpireDate))
      .input('status', sql.NVarChar, statusValue)
      .query(`
        -- تحديث الاشتراك
        UPDATE SubscriptionRenewals
          SET renewalPeriod = @renewalPeriod,
              amountPaid = @amountPaid,
              newExpireDate = @newExpireDate,
              status = @status
        WHERE id = @id;

        -- تحديث حالة الجلسة 
        UPDATE Sessions
          SET status = @status
        WHERE id = @sessionId;
      `)

    return res.status(200).json({
      message: 'تم تعديل سجل التجديد وتأكيد الجلسة بنجاح.'
    })
  } catch (error) {
    console.error('Error updating subscription renewal:', error)
    return res.status(500).json({
      message: 'حدث خطأ أثناء تعديل سجل التجديد.'
    })
  }
}
/**
 * حذف سجل تجديد اشتراك
 * DELETE /api/subscriptions/:id
 */
export const deleteSubscriptionRenewal = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM SubscriptionRenewals WHERE id = @id');
      
    return res.status(200).json({ message: 'تم حذف سجل التجديد بنجاح.' });
  } catch (error) {
    console.error('Error deleting subscription renewal:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء حذف سجل التجديد.' });
  }
};

/**
 * تصدير سجل الاشتراكات بصيغة CSV
 * GET /api/subscriptions/export
 */
export const exportSubscriptionRenewals = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM SubscriptionRenewals ORDER BY renewalDate DESC');
    const renewals = result.recordset;
    
    const fields = ['id', 'sessionId', 'phoneNumber', 'renewalPeriod', 'amountPaid', 'newExpireDate', 'renewalDate'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(renewals);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('subscription-renewals.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting subscription renewals:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء تصدير سجل الاشتراكات.' });
  }
};

/**
 * الحصول على سجلات تجديد الاشتراكات لعميل معين (بناءً على رقم التليفون)
 * GET /api/subscriptions/client/:phoneNumber
 */
export const getClientSubscriptionRenewals = async (req: Request, res: Response) => {
  const { phoneNumber } = req.params;
  if (!phoneNumber) {
    return res.status(400).json({ message: 'رقم التليفون مطلوب.' });
  }
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('phoneNumber', sql.NVarChar, phoneNumber)
      .query('SELECT * FROM SubscriptionRenewals WHERE phoneNumber = @phoneNumber ORDER BY renewalDate DESC');
      
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching client subscription renewals:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب سجلات تجديد الاشتراكات للعميل.' });
  }
};

/**
 * جلب بيانات التحليلات والإحصائيات للتجديدات (عدد التجديدات وإجمالي الإيرادات)
 * GET /api/subscriptions/analytics
 */
export const getSubscriptionAnalytics = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT renewalPeriod, COUNT(*) AS renewalCount, SUM(amountPaid) AS totalRevenue
      FROM SubscriptionRenewals
      GROUP BY renewalPeriod
    `);
      
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات التحليلات.' });
  }
};



export const renewSubscriptionAndRecord = async (req: Request, res: Response) => {
  try {
    const { sessionId, planType, renewalPeriod, amountPaid } = req.body
    if (!sessionId || !planType || !renewalPeriod || !amountPaid) {
      return res.status(400).json({
        message: 'sessionId, planType, renewalPeriod, and amountPaid are required.'
      })
    }

    const pool = await poolPromise;

    // (1) جلب تاريخ انتهاء الحالي للجلسة
    const sessResult = await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .query(`SELECT expireDate FROM Sessions WHERE id = @sessionId`)

    if (sessResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Session not found.' })
    }

    // لو لم يكن له expireDate سابقًا, نبدأ من الآن
    const oldExpire = sessResult.recordset[0].expireDate
      ? dayjs(sessResult.recordset[0].expireDate)
      : dayjs()

    // (2) حساب التاريخ الجديد
    let newExpire = oldExpire
    if (renewalPeriod === 'month') {
      newExpire = oldExpire.add(1, 'month')
    } else if (renewalPeriod === 'year') {
      newExpire = oldExpire.add(1, 'year')
    }
    const newExpireDate = newExpire.toDate()

    // (3) إدراج سجل جديد في SubscriptionRenewals
    const now = new Date() // renewalDate = الآن
    const statusValue = 'Confirmed' // أو حسب ما تحب
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('planType', sql.NVarChar, planType)
      .input('renewalPeriod', sql.NVarChar, renewalPeriod)
      .input('amountPaid', sql.Decimal(18, 2), amountPaid)
      .input('newExpireDate', sql.DateTime, newExpireDate)
      .input('status', sql.NVarChar, statusValue)
      .input('renewalDate', sql.DateTime, now)
      .query(`
        INSERT INTO SubscriptionRenewals
          (sessionId, planType, renewalPeriod, amountPaid, newExpireDate, status, renewalDate)
        VALUES
          (@sessionId, @planType, @renewalPeriod, @amountPaid, @newExpireDate, @status, @renewalDate)
      `)

    // (4) تحديث الجلسة -> الحالة Ready + expireDate=newExpireDate
    await pool.request()
      .input('sessionId', sql.Int, sessionId)
      .input('expireDate', sql.DateTime, newExpireDate)
      .query(`
        UPDATE Sessions
        SET status = 'Ready',
            expireDate = @expireDate
        WHERE id = @sessionId
      `)

    // (يمكنك تشغيل الواتساب عميل إن أردت)
    // if you want createWhatsAppClientForSession(sessionId, ...)

    return res.status(200).json({
      message: 'Renewal recorded successfully.',
      newExpireDate
    })
  } catch (error) {
    console.error('Error renewing subscription:', error)
    return res.status(500).json({ message: 'Error renewing subscription.' })
  }
}



export const getAllSubscriptionRenewals = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT sr.*,
             s.status AS sessionStatus
      FROM SubscriptionRenewals sr
      JOIN Sessions s ON s.id = sr.sessionId
      ORDER BY sr.renewalDate DESC
    `)
    return res.status(200).json(result.recordset)
  } catch (error) {
    console.error('Error fetching subscription renewals:', error)
    return res.status(500).json({ message: 'Error fetching subscription renewals.' })
  }
}