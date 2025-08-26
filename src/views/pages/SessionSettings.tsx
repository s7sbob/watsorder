// src/views/pages/session/SessionSettings.tsx
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography, AppBar, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'

// tabs
// import CategoriesTab   from './CategoriesTab'
// import ProductsTab     from './ProductsTab'
import KeywordsTab     from './KeywordsTab'
import MarketingTab    from './MarketingTab'
// import EcommerceTab    from './EcommerceTab'   // ← NEW
import GreetingTab     from './GreetingTab'

// icons
// import CategoryIcon    from '@mui/icons-material/Category'
// import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import LocalOfferIcon  from '@mui/icons-material/LocalOffer'
import CampaignIcon    from '@mui/icons-material/Campaign'
// import StorefrontIcon  from '@mui/icons-material/Storefront'  // ← NEW
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'

function a11yProps(index: number) {
  return {
    id: `session-tab-${index}`,
    'aria-controls': `session-tabpanel-${index}`,
  }
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`session-tabpanel-${index}`}
      aria-labelledby={`session-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  )
}

const SessionSettings: React.FC = () => {
  const { t } = useTranslation()
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [value, setValue] = useState(0) // start from 0

  if (!sessionId) {
    return <Typography variant="h6">{t('SessionSettings.noSession')}</Typography>
  }

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  return (
    <Box p={2}>
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        {t('SessionSettings.backToSessions')}
      </Button>

      <AppBar position="static" color="default" sx={{ mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          aria-label="session tabs"
        >
          {/* تصحيح الأرقام - تبدأ من 0 */}
          <Tab icon={<LocalOfferIcon />}     label={t('SessionSettings.tabs.keywords')}   {...a11yProps(0)} />
          <Tab icon={<CampaignIcon />}       label={t('SessionSettings.tabs.marketing')}  {...a11yProps(1)} />
          <Tab icon={<EmojiEmotionsIcon />}  label={t('SessionSettings.tabs.greeting')}   {...a11yProps(2)} />
        </Tabs>
      </AppBar>

      {/* تصحيح أرقام TabPanels */}
      <TabPanel value={value} index={0}>
        <KeywordsTab sessionId={+sessionId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <MarketingTab sessionId={+sessionId} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <GreetingTab sessionId={+sessionId} />
      </TabPanel>
    </Box>
  )
}


export default SessionSettings
