import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface MediaFile {
  mediaId: number;
  mediaPath: string;
  mediaName: string;
}

export interface KeywordItem {
  replayId: number;
  keywords: string[];
  replyText: string;
  mediaFiles: MediaFile[];
}

interface KeywordListProps {
  sessionId: number;
}

interface GroupedKeyword {
  replayId: number;
  keywords: string[];
  replyText: string;
  mediaFiles: MediaFile[];
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const KeywordList: React.FC<KeywordListProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [groupKeywords, setGroupKeywords] = useState<string[]>([]);
  const [newReplyText, setNewReplyText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [oldMediaFiles, setOldMediaFiles] = useState<MediaFile[]>([]);

  const fetchKeywords = async () => {
    try {
      const res = await axiosServices.get(`/api/sessions/${sessionId}/keywords`);
      setKeywords(res.data);
    } catch (error) {
      console.error('Error fetching keywords', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchKeywords();
    }
  }, [sessionId]);

  // تجميع الكلمات المفتاحية حسب replayId
  const groupedKeywords = useMemo((): GroupedKeyword[] => {
    return keywords;
  }, [keywords]);

  const handleEdit = (group: GroupedKeyword) => {
    setEditingId(group.replayId);
    setGroupKeywords(group.keywords);
    setNewReplyText(group.replyText);
    setOldMediaFiles(group.mediaFiles || []);
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGroupKeywords([]);
    setNewReplyText('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setOldMediaFiles([]);
  };

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const filesArray = Array.from(event.target.files);
    setSelectedFiles(filesArray);
    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setPreviewUrls(previews);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const formData = new FormData();
      formData.append('newKeyword', groupKeywords.join(', '));
      formData.append('newReplyText', newReplyText);
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append('media', file);
        });
      }
      await axiosServices.post(
        `/api/sessions/${sessionId}/keyword/${editingId}/update`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      handleCancelEdit();
      fetchKeywords();
    } catch (error) {
      console.error('Error updating keyword:', error);
      alert(t('KeywordList.errorUpdating'));
    }
  };

  const handleDelete = async (replayId: number) => {
    if (!window.confirm(t('KeywordList.confirmDelete') as string)) return;
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/keyword/${replayId}/delete`);
      fetchKeywords();
    } catch (error) {
      console.error('Error deleting keyword:', error);
      alert(t('KeywordList.errorDeleting'));
    }
  };

  return (
    <Box>
      <List>
        {groupedKeywords.map((group) => {
          const isEditing = editingId === group.replayId;
          if (isEditing) {
            return (
              <ListItem
                key={group.replayId}
                sx={{ display: 'block', mb: 2, border: '1px solid #ccc', p: 1 }}
              >
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={groupKeywords}
                  onChange={(_event, newValue) => setGroupKeywords(newValue as string[])}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('KeywordList.fields.keyword')}
                      margin="dense"
                      variant="outlined"
                      fullWidth
                      autoFocus
                    />
                  )}
                  sx={{ mb: 1 }}
                />
                <TextField
                  label={t('KeywordList.fields.replyText')}
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <Box sx={{ mb: 1 }}>
                  <Button variant="outlined" component="label" sx={{ mr: 1 }}>
                    {t('KeywordList.buttons.uploadNewImages')}
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={handleFilesChange}
                    />
                  </Button>
                  {selectedFiles.length > 0 && (
                    <Typography variant="body2" sx={{ display: 'inline' }}>
                      {selectedFiles.length} {t('KeywordList.filesSelected')}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                  {previewUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Preview"
                      style={{ width: 100, height: 100, objectFit: 'cover' }}
                    />
                  ))}
                </Box>
                <Box>
                  <Button onClick={handleUpdate} variant="contained" color="primary" sx={{ mr: 1 }}>
                    {t('KeywordList.buttons.save')}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outlined" color="secondary">
                    {t('KeywordList.buttons.cancel')}
                  </Button>
                </Box>
              </ListItem>
            );
          } else {
            return (
              <ListItem
                key={group.replayId}
                sx={{ display: 'block', mb: 2, border: '1px solid #eee', p: 1 }}
              >
                <ListItemText
                  primary={`${t('KeywordList.keywordLabel')}: ${group.keywords.join(', ')}`}
                  secondary={`${t('KeywordList.replyTextLabel')}: ${group.replyText}`}
                />
                {group.mediaFiles && group.mediaFiles.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                    {group.mediaFiles.map((media) => (
                      <Box key={media.mediaId} textAlign="center">
                        <img
                          src={`${backendUrl}/${media.mediaPath}`}
                          alt={media.mediaName}
                          style={{ width: 100, height: 100, objectFit: 'cover' }}
                        />
                        <Typography variant="caption">{media.mediaName}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ mt: 1 }}>
                  <IconButton onClick={() => handleEdit(group)} sx={{ mr: 1 }} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(group.replayId)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItem>
            );
          }
        })}
      </List>
    </Box>
  );
};

export default KeywordList;
