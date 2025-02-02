// src/components/AddKeywordPopup.tsx

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button
} from '@mui/material'
import axiosServices from 'src/utils/axios'

interface AddKeywordPopupProps {
  open: boolean
  onClose: () => void
  sessionId: number
  onSuccess: () => void // دالة لإعادة التحديث بالخارج
}

const AddKeywordPopup: React.FC<AddKeywordPopupProps> = ({
  open, onClose, sessionId, onSuccess
}) => {
  const [keyword, setKeyword] = useState('')
  const [replyText, setReplyText] = useState('')

  const [mediaBase64, setMediaBase64] = useState<string | null>(null)
  const [mediaMime, setMediaMime] = useState<string | null>(null)
  const [mediaFilename, setMediaFilename] = useState<string | null>(null)

  // رفع الملف
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) {
        const base64String = e.target.result.toString()
        const justBase64 = base64String.split(',')[1]
        setMediaBase64(justBase64)
        setMediaMime(file.type)
        setMediaFilename(file.name)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/keyword`, {
        keyword,
        replyText,
        replyMediaBase64: mediaBase64,
        replyMediaMimeType: mediaMime,
        replyMediaFilename: mediaFilename
      })
      onClose()
      onSuccess() // لإعادة جلب الـ Keywords مثلًا
    } catch (error) {
      console.error('Error adding keyword:', error)
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
          Upload Image
          <input type='file' hidden onChange={handleImageChange} accept='image/*' />
        </Button>

        {/* عرض معاينة الصورة إن وجدت */}
        {mediaBase64 && mediaMime && (
          <img
            src={`data:${mediaMime};base64,${mediaBase64}`}
            alt='Reply Media'
            style={{ maxWidth: '150px', maxHeight: '150px', display: 'block', marginTop: '10px' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>Cancel</Button>
        <Button onClick={handleSubmit} color='primary' variant='contained'>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddKeywordPopup
