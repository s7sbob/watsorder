import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  Divider,
  Button,
  Stack
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  StrikethroughS,
  Code,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Preview,
  Send
} from '@mui/icons-material';

interface WhatsAppRichTextEditorProps {
  value?: string;
  onChange?: (value: string, formattedText: string) => void;
  onSend?: (formattedText: string) => void;
  placeholder?: string;
  maxLength?: number;
}

const WhatsAppRichTextEditor: React.FC<WhatsAppRichTextEditorProps> = ({
  value = '',
  onChange,
  onSend,
  placeholder = 'اكتب رسالتك هنا...',
  maxLength = 4096
}) => {
  const [text, setText] = useState(value);
  const [showPreview, setShowPreview] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  // تحويل النص إلى تنسيق WhatsApp
  const convertToWhatsAppFormat = (inputText: string): string => {
    return inputText;
  };

  // إدراج تنسيق في النص
  const insertFormatting = (startSymbol: string, endSymbol: string = startSymbol) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    
    let newText: string;
    
    if (selectedText) {
      // إذا كان هناك نص محدد، أضف التنسيق حوله
      newText = text.substring(0, start) + 
                startSymbol + selectedText + endSymbol + 
                text.substring(end);
    } else {
      // إذا لم يكن هناك نص محدد، أضف رموز التنسيق
      newText = text.substring(0, start) + 
                startSymbol + endSymbol + 
                text.substring(start);
    }
    
    setText(newText);
    
    // تحديث موضع المؤشر
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + startSymbol.length, end + startSymbol.length);
      } else {
        textarea.setSelectionRange(start + startSymbol.length, start + startSymbol.length);
      }
      textarea.focus();
    }, 0);
  };

  // إدراج قائمة
  const insertList = (type: 'bullet' | 'numbered') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = text.substring(0, start).split('\n');
    const currentLineStart = text.lastIndexOf('\n', start - 1) + 1;
    
    let prefix: string;
    if (type === 'bullet') {
      prefix = '• ';
    } else {
      // للقوائم المرقمة، نحتاج لمعرفة الرقم التالي
      const existingNumbers = lines
        .filter(line => /^\d+\.\s/.test(line.trim()))
        .map(line => parseInt(line.trim().match(/^(\d+)\./)?.[1] || '0'));
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      prefix = `${nextNumber}. `;
    }

    const newText = text.substring(0, currentLineStart) + 
                   prefix + 
                   text.substring(currentLineStart);
    
    setText(newText);
    
    setTimeout(() => {
      textarea.setSelectionRange(currentLineStart + prefix.length, currentLineStart + prefix.length);
      textarea.focus();
    }, 0);
  };

  // إدراج اقتباس
  const insertQuote = () => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const currentLineStart = text.lastIndexOf('\n', start - 1) + 1;
    
    const newText = text.substring(0, currentLineStart) + 
                   '> ' + 
                   text.substring(currentLineStart);
    
    setText(newText);
    
    setTimeout(() => {
      textarea.setSelectionRange(currentLineStart + 2, currentLineStart + 2);
      textarea.focus();
    }, 0);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    if (newText.length <= maxLength) {
      setText(newText);
      const formatted = convertToWhatsAppFormat(newText);
      onChange?.(newText, formatted);
    }
  };

  const handleSend = () => {
    const formatted = convertToWhatsAppFormat(text);
    onSend?.(formatted);
  };

  // معاينة النص كما سيظهر في WhatsApp
  const renderPreview = () => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      let processedLine = line;
      
      // معالجة التنسيق
      processedLine = processedLine
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Bold
        .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic
        .replace(/~([^~]+)~/g, '<del>$1</del>') // Strikethrough
        .replace(/`([^`]+)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'); // Code

      // معالجة القوائم والاقتباسات
      if (line.startsWith('• ')) {
        return (
          <div key={index} style={{ marginLeft: '20px' }}>
            <span dangerouslySetInnerHTML={{ __html: processedLine }} />
          </div>
        );
      } else if (/^\d+\.\s/.test(line)) {
        return (
          <div key={index} style={{ marginLeft: '20px' }}>
            <span dangerouslySetInnerHTML={{ __html: processedLine }} />
          </div>
        );
      } else if (line.startsWith('> ')) {
        return (
          <div key={index} style={{ 
            borderLeft: '3px solid #ccc', 
            paddingLeft: '10px', 
            marginLeft: '10px',
            fontStyle: 'italic',
            color: '#666'
          }}>
            <span dangerouslySetInnerHTML={{ __html: processedLine.substring(2) }} />
          </div>
        );
      }

      return (
        <div key={index}>
          <span dangerouslySetInnerHTML={{ __html: processedLine }} />
        </div>
      );
    });
  };

  return (
    <Paper elevation={2} sx={{ width: '100%', maxWidth: 600 }}>
      {/* شريط الأدوات */}
      <Toolbar variant="dense" sx={{ minHeight: 48, backgroundColor: '#f5f5f5' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="نص عريض (*نص*)">
            <IconButton size="small" onClick={() => insertFormatting('*')}>
              <FormatBold />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="نص مائل (_نص_)">
            <IconButton size="small" onClick={() => insertFormatting('_')}>
              <FormatItalic />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="نص مشطوب (~نص~)">
            <IconButton size="small" onClick={() => insertFormatting('~')}>
              <StrikethroughS />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="كود (`كود`)">
            <IconButton size="small" onClick={() => insertFormatting('`')}>
              <Code />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem />
          
          <Tooltip title="قائمة نقطية">
            <IconButton size="small" onClick={() => insertList('bullet')}>
              <FormatListBulleted />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="قائمة مرقمة">
            <IconButton size="small" onClick={() => insertList('numbered')}>
              <FormatListNumbered />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="اقتباس">
            <IconButton size="small" onClick={insertQuote}>
              <FormatQuote />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem />
          
          <Tooltip title="معاينة">
            <IconButton 
              size="small" 
              onClick={() => setShowPreview(!showPreview)}
              color={showPreview ? 'primary' : 'default'}
            >
              <Preview />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>

      <Divider />

      {/* منطقة النص */}
      <Box sx={{ p: 2 }}>
        {!showPreview ? (
          <TextField
            inputRef={textAreaRef}
            multiline
            rows={6}
            fullWidth
            value={text}
            onChange={handleTextChange}
            placeholder={placeholder}
            variant="outlined"
            inputProps={{
              style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.4'
              }
            }}
          />
        ) : (
          <Box
            sx={{
              minHeight: 150,
              p: 2,
              border: '1px solid #ccc',
              borderRadius: 1,
              backgroundColor: '#fff',
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              lineHeight: '1.4'
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              معاينة الرسالة كما ستظهر في WhatsApp:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {text ? renderPreview() : (
                <Typography color="text.secondary" fontStyle="italic">
                  لا يوجد نص للمعاينة
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* عداد الأحرف */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {text.length} / {maxLength} حرف
          </Typography>
          
          {onSend && (
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSend}
              disabled={!text.trim()}
              size="small"
            >
              إرسال
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default WhatsAppRichTextEditor;

