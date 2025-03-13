import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import KeywordList from './KeywordList';
import AddDataPopup from './AddDataPopup';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface KeywordsTabProps {
  sessionId: number;
}

const KeywordsTab: React.FC<KeywordsTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleAddKeywords = async (data: any) => {
    const { keywords, replyText, replyMedia } = data;
    if (!keywords?.length) {
      alert(t('KeywordsTab.alerts.noKeywords'));
      return;
    }
    if (!replyText) {
      alert(t('KeywordsTab.alerts.noReplyText'));
      return;
    }
    try {
      const formData = new FormData();
      // إرسال الكلمات كمجموعة باستخدام سلسلة مفصولة بفواصل
      formData.append('keywords', keywords.join(', '));
      formData.append('replyText', replyText);
      if (Array.isArray(replyMedia) && replyMedia.length > 0) {
        replyMedia.forEach((file: File) => {
          formData.append('media', file, file.name);
        });
      }
      await axiosServices.post(`/api/sessions/${sessionId}/keyword`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setOpenAddPopup(false);
      setRefresh(!refresh);
    } catch (err) {
      console.error('Error adding keywords:', err);
      alert(t('KeywordsTab.alerts.errorAdd'));
    }
  };

  return (
    <Box>
      <Button variant='contained' onClick={() => setOpenAddPopup(true)} sx={{ mb: 2 }}>
        {t('KeywordsTab.buttons.addKeywords')}
      </Button>
      <KeywordList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddKeywords}
        title={t('KeywordsTab.popup.title')}
        fields={[
          { label: t('KeywordsTab.popup.fields.keywords'), name: 'keywords', isMultipleKeywords: true },
          { label: t('KeywordsTab.popup.fields.replyText'), name: 'replyText' },
          { label: t('KeywordsTab.popup.fields.replyMedia'), name: 'replyMedia', isFile: true, multiple: true }
        ]}
      />
    </Box>
  );
};

export default KeywordsTab;
