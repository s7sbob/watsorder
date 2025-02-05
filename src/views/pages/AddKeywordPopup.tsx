import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box
} from '@mui/material'
import axiosServices from 'src/utils/axios'

interface AddKeywordPopupProps {
  open: boolean
  onClose: () => void
  sessionId: number
  onSuccess: () => void // دالة لإعادة التحديث بالخارج (لإعادة الجلب مثلًا)
}

const AddKeywordPopup: React.FC<AddKeywordPopupProps> = ({
  open,
  onClose,
  sessionId,
  onSuccess
}) => {
  const [keyword, setKeyword] = useState('')
  const [replyText, setReplyText] = useState('')

  // نخزن الملفات التي سيختارها المستخدم
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  // للمعاينة (إن أردت معاينة الصور قبل الرفع)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  // عند تغيير الملفات
  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    const filesArray = Array.from(event.target.files)
    setSelectedFiles(filesArray)

    // إنشاء روابط مؤقتة للمعاينة (URL.createObjectURL)
    const previews = filesArray.map(file => URL.createObjectURL(file))
    setPreviewUrls(previews)
  }

  // عند إغلاق الـDialog، ننظف الحالة
  useEffect(() => {
    if (!open) {
      setKeyword('')
      setReplyText('')
      setSelectedFiles([])
      setPreviewUrls([])
    }
  }, [open])

  const handleSubmit = async () => {
    try {
      // نستخدم FormData
      const formData = new FormData()
      formData.append('keyword', keyword)
      formData.append('replyText', replyText)

      // نضيف كل الملفات
      selectedFiles.forEach(file => {
        formData.append('media', file) // نفس الحقل الذي يستقبله multer.array('media', ...)
      })

      await axiosServices.post(`/api/sessions/${sessionId}/keyword`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      onClose()
      onSuccess() // إعادة جلب الكلمات المفتاحية مثلًا
    } catch (error) {
      console.error('Error adding keyword:', error)
      // يمكنك إضافة Snackbar أو Alert حسب واجهتك
      alert('Error adding keyword.')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Add Keyword</DialogTitle>
      <DialogContent>
        <TextField
          label='Keyword'
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
        <TextField
          label='Reply Text'
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />

        <Button variant='contained' component='label' sx={{ mt: 2 }}>
          Upload Image(s)
          <input
            type='file'
            hidden
            multiple // السماح برفع أكثر من ملف
            accept='image/*'
            onChange={handleFilesChange}
          />
        </Button>

        {/* عرض معاينات الصور (إن وجدت) */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          {previewUrls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt='preview'
              style={{ width: 100, height: 100, objectFit: 'cover' }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color='primary' variant='contained'>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddKeywordPopup
