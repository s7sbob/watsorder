// src/components/tabs/KeywordsTab.tsx
import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import KeywordList from './KeywordList';
import AddDataPopup from './AddDataPopup';
import axiosServices from 'src/utils/axios';

interface KeywordsTabProps {
  sessionId: number;
}

const KeywordsTab: React.FC<KeywordsTabProps> = ({ sessionId }) => {
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleAddKeywords = async (data: any) => {
    const { keywords, replyText, replyMedia } = data;
    if (!keywords?.length) {
      alert('Please enter at least one keyword!');
      return;
    }
    if (!replyText) {
      alert('Please provide a reply text!');
      return;
    }

    try {
      // لكل كلمة مفتاحية نقوم بإنشاء FormData وإرساله
      for (const kw of keywords) {
        const formData = new FormData();
        formData.append('keyword', kw);
        formData.append('replyText', replyText);
        if (Array.isArray(replyMedia)) {
          replyMedia.forEach((file: File) => {
            formData.append('media', file, file.name);
          });
        }
        await axiosServices.post(`/api/sessions/${sessionId}/keyword`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setOpenAddPopup(false);
      setRefresh(!refresh);
    } catch (err) {
      console.error('Error adding multiple keywords:', err);
      alert('Error adding multiple keywords.');
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={() => setOpenAddPopup(true)} sx={{ mb: 2 }}>
        Add Keyword(s)
      </Button>
      <KeywordList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddKeywords}
        title="Add Multiple Keyword(s) with Reply"
        fields={[
          { label: 'Keywords', name: 'keywords', isMultipleKeywords: true },
          { label: 'Reply Text', name: 'replyText' },
          { label: 'Reply Media', name: 'replyMedia', isFile: true, multiple: true }
        ]}
      />
    </Box>
  );
};

export default KeywordsTab;
