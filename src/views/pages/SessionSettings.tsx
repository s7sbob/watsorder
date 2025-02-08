// src/pages/SessionSettings.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import CategoriesTab from './CategoriesTab';
import ProductsTab from './ProductsTab';
import KeywordsTab from './KeywordsTab';
import BroadcastTab from './BroadcastTab';
import GreetingTab from './GreetingTab';

const SessionSettings: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'keywords' | 'broadcast' | 'greeting'>('categories');

  if (!sessionId) {
    return <Typography variant="h6">No session selected.</Typography>;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'categories':
        return <CategoriesTab sessionId={parseInt(sessionId, 10)} />;
      case 'products':
        return <ProductsTab sessionId={parseInt(sessionId, 10)} />;
      case 'keywords':
        return <KeywordsTab sessionId={parseInt(sessionId, 10)} />;
      case 'broadcast':
        return <BroadcastTab sessionId={parseInt(sessionId, 10)} />;
      case 'greeting':
        return <GreetingTab sessionId={parseInt(sessionId, 10)} />;
      default:
        return null;
    }
  };

  return (
    <Box p={2}>
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back to Sessions
      </Button>
      {/* Header التبويبي */}
      <Box display="flex" gap={2} mb={2}>
        <Button
          variant={activeTab === 'categories' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('categories')}
        >
          Category's
        </Button>
        <Button
          variant={activeTab === 'products' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('products')}
        >
          Products
        </Button>
        <Button
          variant={activeTab === 'keywords' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('keywords')}
        >
          Keywords
        </Button>
        <Button
          variant={activeTab === 'broadcast' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('broadcast')}
        >
          Broadcast
        </Button>
        <Button
          variant={activeTab === 'greeting' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('greeting')}
        >
          Greeting
        </Button>
      </Box>
      <Box>{renderActiveTab()}</Box>
    </Box>
  );
};

export default SessionSettings;
