import React, { useEffect, useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import axiosServices from 'src/utils/axios'
import { useTranslation } from 'react-i18next'

interface MediaFile {
  mediaId: number
  mediaPath: string
  mediaName: string
}
interface KeywordItem {
  keywordId: number
  keyword: string
  replayId: number
  replyText: string
  mediaFiles: MediaFile[]
}

interface KeywordListProps {
  sessionId: number
}

const KeywordList: React.FC<KeywordListProps> = ({ sessionId }) => {
  const { t } = useTranslation()
  const [keywords, setKeywords] = useState<KeywordItem[]>([])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newReplyText, setNewReplyText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

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
  }, [sessionId])

  const handleEdit = (kw: KeywordItem) => {
    setEditingId(kw.keywordId)
    setNewKeyword(kw.keyword)
    setNewReplyText(kw.replyText)
    setSelectedFiles([])
    setPreviewUrls([])
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setNewKeyword('')
    setNewReplyText('')
    setSelectedFiles([])
    setPreviewUrls([])
  }

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    const filesArray = Array.from(event.target.files)
    setSelectedFiles(filesArray)
    const previews = filesArray.map(file => URL.createObjectURL(file))
    setPreviewUrls(previews)
  }

  const handleUpdate = async () => {
    if (!editingId) return

    try {
      const formData = new FormData()
      formData.append('newKeyword', newKeyword)
      formData.append('newReplyText', newReplyText)
      selectedFiles.forEach(file => {
        formData.append('media', file)
      })

      await axiosServices.post(`/api/sessions/${sessionId}/keyword/${editingId}/update`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      handleCancelEdit()
      fetchKeywords()
    } catch (error) {
      console.error('Error updating keyword:', error)
      alert(t('KeywordList.errorUpdating'))
    }
  }

  const handleDelete = async (keywordId: number) => {
    if (!window.confirm(t('KeywordList.confirmDelete') as string)) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/keyword/${keywordId}/delete`)
      fetchKeywords()
    } catch (error) {
      console.error('Error deleting keyword:', error)
      alert(t('KeywordList.errorDeleting'))
    }
  }

  return (
    <Box>
      <List>
        {keywords.map(kw => {
          const isEditing = editingId === kw.keywordId
          if (isEditing) {
            return (
              <ListItem key={kw.keywordId} sx={{ display: 'block', mb: 2, border: '1px solid #ccc' }}>
                <TextField
                  label={t('KeywordList.fields.keyword')}
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  size='small'
                  sx={{ mb: 1, mr: 1 }}
                />
                <TextField
                  label={t('KeywordList.fields.replyText')}
                  value={newReplyText}
                  onChange={e => setNewReplyText(e.target.value)}
                  size='small'
                  sx={{ mb: 1, mr: 1 }}
                />
                <Box sx={{ mb: 1 }}>
                  <Button variant='outlined' component='label' sx={{ mr: 1 }}>
                    {t('KeywordList.buttons.uploadNewImages')}
                    <input
                      type='file'
                      hidden
                      multiple
                      accept='image/*'
                      onChange={handleFilesChange}
                    />
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Typography variant='body2' sx={{ display: 'inline' }}>
                      {selectedFiles.length} {t('KeywordList.filesSelected')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                  {previewUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt='Preview'
                      style={{ width: 100, height: 100, objectFit: 'cover' }}
                    />
                  ))}
                </Box>
                <Box>
                  <Button onClick={handleUpdate} variant='contained' color='primary' sx={{ mr: 1 }}>
                    {t('KeywordList.buttons.save')}
                  </Button>
                  <Button onClick={handleCancelEdit} variant='outlined' color='secondary'>
                    {t('KeywordList.buttons.cancel')}
                  </Button>
                </Box>
              </ListItem>
            )
          } else {
            return (
              <ListItem
                key={kw.keywordId}
                sx={{ display: 'block', mb: 2, border: '1px solid #eee' }}
              >
                <ListItemText
                  primary={`${t('KeywordList.keywordLabel')}: ${kw.keyword}`}
                  secondary={`${t('KeywordList.replyTextLabel')}: ${kw.replyText}`}
                />
                {kw.mediaFiles && kw.mediaFiles.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                    {kw.mediaFiles.map(media => (
                      <Box key={media.mediaId} textAlign='center'>
                        <img
                          src={`/${media.mediaPath}`}
                          alt={media.mediaName}
                          style={{ width: 100, height: 100, objectFit: 'cover' }}
                        />
                        <Typography variant='caption'>{media.mediaName}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ mt: 1 }}>
                  <IconButton onClick={() => handleEdit(kw)} sx={{ mr: 1 }} color='primary'>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(kw.keywordId)} color='error'>
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
