// utils/whatsappMessageFormatter.ts

/**
 * تحويل النص المنسق إلى تنسيق WhatsApp المدعوم
 * يتعامل مع جميع أنواع التنسيق المدعومة في WhatsApp
 */
export class WhatsAppMessageFormatter {
  
  /**
   * تحويل النص المنسق إلى تنسيق WhatsApp
   * @param richText النص المنسق من Rich Text Editor
   * @returns النص بتنسيق WhatsApp
   */
  static formatForWhatsApp(richText: string): string {
    if (!richText) return '';
    
    let formattedText = richText;
    
    // تنظيف النص من أي HTML tags إضافية
    formattedText = this.cleanHtmlTags(formattedText);
    
    // التأكد من صحة تنسيق WhatsApp
    formattedText = this.validateWhatsAppFormatting(formattedText);
    
    return formattedText;
  }

  /**
   * إزالة HTML tags غير المدعومة
   */
  private static cleanHtmlTags(text: string): string {
    // إزالة أي HTML tags عدا التنسيق الأساسي
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]*>/g, ''); // إزالة باقي HTML tags
  }

  /**
   * التحقق من صحة تنسيق WhatsApp وإصلاح الأخطاء
   */
  private static validateWhatsAppFormatting(text: string): string {
    let result = text;
    
    // إصلاح النص العريض - التأكد من وجود * في البداية والنهاية
    result = this.fixFormatting(result, '*');
    
    // إصلاح النص المائل - التأكد من وجود _ في البداية والنهاية
    result = this.fixFormatting(result, '_');
    
    // إصلاح النص المشطوب - التأكد من وجود ~ في البداية والنهاية
    result = this.fixFormatting(result, '~');
    
    // إصلاح الكود - التأكد من وجود ` في البداية والنهاية
    result = this.fixFormatting(result, '`');
    
    return result;
  }

  /**
   * إصلاح تنسيق معين (مثل *, _, ~, `)
   */
  private static fixFormatting(text: string, symbol: string): string {
    // البحث عن رموز التنسيق غير المكتملة وإزالتها
    const regex = new RegExp(`\\${symbol}([^\\${symbol}]*?)\\${symbol}`, 'g');
    
    // التأكد من أن كل رمز تنسيق له بداية ونهاية
    let result = text;
    let openCount = 0;
    let newResult = '';
    
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (char === symbol) {
        if (openCount === 0) {
          // بداية تنسيق جديد
          openCount = 1;
          newResult += char;
        } else {
          // نهاية التنسيق
          openCount = 0;
          newResult += char;
        }
      } else {
        newResult += char;
      }
    }
    
    // إذا كان هناك رمز تنسيق مفتوح، أغلقه
    if (openCount > 0) {
      newResult += symbol;
    }
    
    return newResult;
  }

  /**
   * تحويل القوائم إلى تنسيق WhatsApp
   */
  static formatLists(text: string): string {
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      const trimmedLine = line.trim();
      
      // قائمة نقطية
      if (trimmedLine.startsWith('• ')) {
        return trimmedLine;
      }
      
      // قائمة مرقمة
      if (/^\d+\.\s/.test(trimmedLine)) {
        return trimmedLine;
      }
      
      // اقتباس
      if (trimmedLine.startsWith('> ')) {
        return trimmedLine;
      }
      
      return line;
    });
    
    return formattedLines.join('\n');
  }

  /**
   * التحقق من طول الرسالة (WhatsApp له حد أقصى)
   */
  static validateMessageLength(text: string, maxLength: number = 4096): {
    isValid: boolean;
    message: string;
    truncatedText?: string;
  } {
    if (text.length <= maxLength) {
      return {
        isValid: true,
        message: 'Message length is valid'
      };
    }
    
    // اقتطاع النص مع الحفاظ على التنسيق
    const truncatedText = this.truncateWithFormatting(text, maxLength);
    
    return {
      isValid: false,
      message: `Message is too long (${text.length}/${maxLength} characters)`,
      truncatedText
    };
  }

  /**
   * اقتطاع النص مع الحفاظ على التنسيق
   */
  private static truncateWithFormatting(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // اقتطاع النص
    let truncated = text.substring(0, maxLength - 3); // -3 للنقاط ...
    
    // التأكد من عدم قطع كلمة في المنتصف
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) { // إذا كان المسافة قريبة من النهاية
      truncated = truncated.substring(0, lastSpaceIndex);
    }
    
    // إصلاح التنسيق المقطوع
    truncated = this.validateWhatsAppFormatting(truncated);
    
    return truncated + '...';
  }

  /**
   * تحويل النص إلى معاينة لعرضها في الواجهة
   */
  static generatePreview(text: string): string {
    // تحويل رموز التنسيق إلى HTML للمعاينة
    let preview = text
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Bold
      .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic
      .replace(/~([^~]+)~/g, '<del>$1</del>') // Strikethrough
      .replace(/`([^`]+)`/g, '<code>$1</code>') // Code
      .replace(/\n/g, '<br>'); // Line breaks
    
    return preview;
  }

  /**
   * استخراج الوسائط من النص (إذا كانت مضمنة)
   */
  static extractMedia(text: string): {
    cleanText: string;
    mediaUrls: string[];
  } {
    const mediaUrls: string[] = [];
    
    // البحث عن URLs للصور أو الفيديوهات
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|mp4|mp3|pdf))/gi;
    const matches = text.match(urlRegex);
    
    if (matches) {
      mediaUrls.push(...matches);
    }
    
    // إزالة URLs من النص
    const cleanText = text.replace(urlRegex, '').trim();
    
    return {
      cleanText,
      mediaUrls
    };
  }

  /**
   * دمج النص مع معلومات إضافية (مثل التوقيت أو المرسل)
   */
  static addMetadata(text: string, metadata: {
    timestamp?: Date;
    sender?: string;
    sessionName?: string;
  }): string {
    let result = text;
    
    // if (metadata.sessionName) {
    //   result = `*${metadata.sessionName}*\n\n${result}`;
    // }
    
    // if (metadata.timestamp) {
    //   const timeString = metadata.timestamp.toLocaleString('ar-EG');
    //   result += `\n\n_تم الإرسال: ${timeString}_`;
    // }
    
    return result;
  }
}

export default WhatsAppMessageFormatter;

