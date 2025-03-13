// src/views/pages/session/MarketingTab.tsx
import React, { useState } from 'react';
import { Box, AppBar, Tabs, Tab } from '@mui/material';
import { useTranslation } from 'react-i18next';
import BroadcastTab from './BroadcastTab'; // نفس الكود القديم

interface MarketingTabProps {
  sessionId: number;
}

function a11yProps(index: number) {
  return {
    id: `marketing-subtab-${index}`,
    'aria-controls': `marketing-subtabpanel-${index}`,
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`marketing-subtabpanel-${index}`}
      aria-labelledby={`marketing-subtab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const MarketingTab: React.FC<MarketingTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box>
      <AppBar position="static" color="default" sx={{ mb: 2 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          aria-label="marketing sub tabs"
        >
          <Tab label={t('MarketingTab.broadcast')} {...a11yProps(0)} />
          {/* يمكنك إضافة تبويبات فرعية أخرى لاحقًا */}
        </Tabs>
      </AppBar>

      <TabPanel value={value} index={0}>
        <BroadcastTab sessionId={sessionId} />
      </TabPanel>
    </Box>
  );
};

export default MarketingTab;
