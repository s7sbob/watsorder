import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  Input
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import WhatsAppRichTextEditor from 'src/components/WhatsAppRichTextEditor';

interface AddKeywordPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    keywords: string[];
    replyText: string;
    replyMedia: File[];
  }) => void;
  title: string;
}

const AddKeywordPopup: React.FC<AddKeywordPopupProps> = ({
  open,
  onClose,
  onSubmit,
  title
}) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [replyText, setReplyText] = useState('');
  const [formattedReplyText, setFormattedReplyText] = useState('');
  const [replyMedia, setReplyMedia] = useState<File[]>([]);

  const handleAddKeyword = () => {
    if (currentKeyword.trim() && !keywords.includes(currentKeyword.trim())) {
      setKeywords([...keywords, currentKeyword.trim()]);
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(keyword => keyword !== keywordToRemove));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddKeyword();
    }
  };

  const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setReplyMedia(Array.from(event.target.files));
    }
  };

  const handleRichTextChange = (rawText: string, formatted: string) => {
    setReplyText(rawText);
    setFormattedReplyText(formatted);
  };

  const handleSubmit = () => {
    onSubmit({
      keywords,
      replyText: formattedReplyText, // إرسال النص المنسق
      replyMedia
    });
    // إعادة تعيين النموذج
    setKeywords([]);
    setCurrentKeyword('');
    setReplyText('');
    setFormattedReplyText('');
    setReplyMedia([]);
  };

  const handleClose = () => {
    // إعادة تعيين النموذج عند الإغلاق
    setKeywords([]);
    setCurrentKeyword('');
    setReplyText('');
    setFormattedReplyText('');
    setReplyMedia([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* إضافة الكلمات المفتاحية */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              الكلمات المفتاحية
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={currentKeyword}
                onChange={(e) => setCurrentKeyword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="أدخل كلمة مفتاحية واضغط Enter"
              />
              <Button
                variant="outlined"
                onClick={handleAddKeyword}
                disabled={!currentKeyword.trim()}
                startIcon={<Add />}
              >
                إضافة
              </Button>
            </Box>
            
            {/* عرض الكلمات المفتاحية المضافة */}
            {keywords.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {keywords.map((keyword, index) => (
                  <Chip
                    key={index}
                    label={keyword}
                    onDelete={() => handleRemoveKeyword(keyword)}
                    deleteIcon={<Delete />}
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* محرر النص المنسق للرد */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              نص الرد
            </Typography>
            <WhatsAppRichTextEditor
              value={replyText}
              onChange={handleRichTextChange}
              placeholder="اكتب نص الرد هنا... يمكنك استخدام التنسيق لجعله أكثر جاذبية"
              maxLength={4096}
            />
          </Box>

          {/* رفع الملفات */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              ملفات مرفقة (اختياري)
            </Typography>
            <Input
              type="file"
              inputProps={{ multiple: true, accept: 'image/*,video/*,audio/*,.pdf,.doc,.docx' }}
              onChange={handleMediaChange}
              fullWidth
            />
            {replyMedia.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  الملفات المحددة: {replyMedia.map(file => file.name).join(', ')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>إلغاء</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={keywords.length === 0 || !formattedReplyText.trim()}
        >
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddKeywordPopup;

