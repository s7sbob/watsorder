// src/components/KeywordList.tsx

import React, { useEffect, useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import axiosServices from 'src/utils/axios'

// شكل البيانات التي سنستقبلها
interface KeywordItem {
  keywordId: number
  keyword: string
  replayId: number
  replyText: string
  replyMediaBase64?: string | null
  replyMediaMimeType?: string | null
  replyMediaFilename?: string | null
}

interface KeywordListProps {
  sessionId: number
}

const KeywordList: React.FC<KeywordListProps> = ({ sessionId }) => {
  const [keywords, setKeywords] = useState<KeywordItem[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newReplyText, setNewReplyText] = useState('')

  // حقول للصورة / الميديا
  const [newMediaBase64, setNewMediaBase64] = useState<string | null>(null)
  const [newMediaMime, setNewMediaMime] = useState<string | null>(null)
  const [newMediaFilename, setNewMediaFilename] = useState<string | null>(null)

  // جلب الـ Keywords
  const fetchKeywords = async () => {
    try {
      const res = await axiosServices.get(`/api/sessions/${sessionId}/keywords`)
      setKeywords(res.data)
    } catch (error) {
      console.error('Error fetching keywords', error)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchKeywords()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // عند الضغط على زر "Edit"
  const handleEdit = (kw: KeywordItem) => {
    setEditingId(kw.keywordId)
    setNewKeyword(kw.keyword)
    setNewReplyText(kw.replyText)
    setNewMediaBase64(kw.replyMediaBase64 || null)
    setNewMediaMime(kw.replyMediaMimeType || null)
    setNewMediaFilename(kw.replyMediaFilename || null)
  }

  // إلغاء التعديل
  const handleCancelEdit = () => {
    setEditingId(null)
    setNewKeyword('')
    setNewReplyText('')
    setNewMediaBase64(null)
    setNewMediaMime(null)
    setNewMediaFilename(null)
  }

  // عند تغيير الصورة في فورم التعديل
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) {
        const base64String = e.target.result.toString()
        const justBase64 = base64String.split(',')[1] // الجزء بعد "base64,"
        setNewMediaBase64(justBase64)
        setNewMediaMime(file.type)
        setNewMediaFilename(file.name)
      }
    }
    reader.readAsDataURL(file)
  }

  // زر "Remove Image" مثلاً
  const handleRemoveImage = () => {
    setNewMediaBase64(null)
    setNewMediaMime(null)
    setNewMediaFilename(null)
  }

  // حفظ التعديلات
  const handleUpdate = async () => {
    if (!editingId) return

    try {
      await axiosServices.put(`/api/sessions/${sessionId}/keyword/${editingId}`, {
        newKeyword,
        newReplyText,
        newReplyMediaBase64: newMediaBase64,
        newReplyMediaMimeType: newMediaMime,
        newReplyMediaFilename: newMediaFilename
      })
      // بعد النجاح
      handleCancelEdit()
      fetchKeywords()
    } catch (error) {
      console.error('Error updating keyword:', error)
    }
  }

  // حذف الكلمة
  const handleDelete = async (kw: KeywordItem) => {
    if (!window.confirm('هل تريد حذف هذه الكلمة المفتاحية؟')) return
    try {
      await axiosServices.delete(`/api/sessions/${sessionId}/keyword/${kw.keywordId}`)
      fetchKeywords()
    } catch (error) {
      console.error('Error deleting keyword:', error)
    }
  }

  // دالة لمعاينة الصورة لو وجدت
  const getImagePreview = (kw: KeywordItem) => {
    if (kw.replyMediaBase64 && kw.replyMediaMimeType) {
      return `data:${kw.replyMediaMimeType};base64,${kw.replyMediaBase64}`
    }
    return null
  }

  return (
    <Box>
      <List>
        {keywords.map(kw => {
          const isEditing = editingId === kw.keywordId

          if (isEditing) {
            // ===== في وضع "Edit" =====
            return (
              <ListItem key={kw.keywordId} sx={{ display: 'block' }}>
                {/* تعديل الـ keyword */}
                <TextField
                  label='Keyword'
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  size='small'
                  sx={{ mb: 1, mr: 1 }}
                />
                {/* تعديل الـ replyText */}
                <TextField
                  label='Reply Text'
                  value={newReplyText}
                  onChange={e => setNewReplyText(e.target.value)}
                  size='small'
                  sx={{ mb: 1, mr: 1 }}
                />

                {/* حقل رفع صورة/ملف */}
                <Box sx={{ mb: 1 }}>
                  <Button variant='outlined' component='label' sx={{ mr: 1 }}>
                    Upload Image
                    <input type='file' hidden onChange={handleImageChange} accept='image/*' />
                  </Button>
                  {/* زر إزالة الصورة إن وجدت */}
                  {newMediaBase64 && (
                    <Button variant='contained' color='error' onClick={handleRemoveImage}>
                      Remove Image
                    </Button>
                  )}
                </Box>

                {/* معاينة الصورة الحالية (إن وجدت) */}
                {newMediaBase64 && newMediaMime && (
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={`data:${newMediaMime};base64,${newMediaBase64}`}
                      alt='Reply Media'
                      style={{ maxWidth: '150px', maxHeight: '150px' }}
                    />
                  </Box>
                )}

                <Box>
                  <Button onClick={handleUpdate} variant='contained' color='primary' sx={{ mr: 1 }}>
                    Save
                  </Button>
                  <Button onClick={handleCancelEdit} variant='outlined' color='secondary'>
                    Cancel
                  </Button>
                </Box>
              </ListItem>
            )
          } else {
            // ===== عرض عادي =====
            const preview = getImagePreview(kw)
            return (
              <ListItem key={kw.keywordId} sx={{ display: 'flex', flexDirection: 'column' }}>
                <ListItemText
                  primary={`Keyword: ${kw.keyword}`}
                  secondary={`ReplyText: ${kw.replyText}`}
                />
                {/* لو عنده صورة => نعرضها */}
                {preview && (
                  <Box sx={{ mb: 1 }}>
                    <img
                      src={preview}
                      alt='Reply Media'
                      style={{ maxWidth: '150px', maxHeight: '150px' }}
                    />
                  </Box>
                )}
                <Box>
                  <IconButton onClick={() => handleEdit(kw)} sx={{ mr: 1 }} color='primary'>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(kw)} color='error'>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItem>
            )
          }
        })}
      </List>
    </Box>
  )
}

export default KeywordList
