import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'

// Tabs
import CategoriesTab from './CategoriesTab'
import ProductsTab from './ProductsTab'
import KeywordsTab from './KeywordsTab'
import BroadcastTab from './BroadcastTab'
import GreetingTab from './GreetingTab'

// i18n
import { useTranslation } from 'react-i18next'

const SessionSettings: React.FC = () => {
  const { t } = useTranslation()
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<
    'categories' | 'products' | 'keywords' | 'broadcast' | 'greeting'
  >('categories')

  if (!sessionId) {
    return <Typography variant='h6'>{t('SessionSettings.noSession')}</Typography>
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'categories':
        return <CategoriesTab sessionId={parseInt(sessionId, 10)} />
      case 'products':
        return <ProductsTab sessionId={parseInt(sessionId, 10)} />
      case 'keywords':
        return <KeywordsTab sessionId={parseInt(sessionId, 10)} />
      case 'broadcast':
        return <BroadcastTab sessionId={parseInt(sessionId, 10)} />
      case 'greeting':
        return <GreetingTab sessionId={parseInt(sessionId, 10)} />
      default:
        return null
    }
  }

  return (
    <Box p={2}>
      <Button variant='outlined' onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        {t('SessionSettings.backToSessions')}
      </Button>

      {/* Header التبويبي */}
      <Box display='flex' gap={2} mb={2}>
        <Button
          variant={activeTab === 'categories' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('categories')}
        >
          {t('SessionSettings.tabs.categories')}
        </Button>
        <Button
          variant={activeTab === 'products' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('products')}
        >
          {t('SessionSettings.tabs.products')}
        </Button>
        <Button
          variant={activeTab === 'keywords' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('keywords')}
        >
          {t('SessionSettings.tabs.keywords')}
        </Button>
        <Button
          variant={activeTab === 'broadcast' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('broadcast')}
        >
          {t('SessionSettings.tabs.broadcast')}
        </Button>
        <Button
          variant={activeTab === 'greeting' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('greeting')}
        >
          {t('SessionSettings.tabs.greeting')}
        </Button>
      </Box>
      <Box>{renderActiveTab()}</Box>
    </Box>
  )
}

export default SessionSettings
