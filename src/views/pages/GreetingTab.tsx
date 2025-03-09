import React, { useState, useEffect } from 'react'
import { Box, TextField, FormControlLabel, Checkbox, Button } from '@mui/material'
import axiosServices from 'src/utils/axios'
import { useTranslation } from 'react-i18next'

interface GreetingTabProps {
  sessionId: number
}

const GreetingTab: React.FC<GreetingTabProps> = ({ sessionId }) => {
  const { t } = useTranslation()
  const [greetingData, setGreetingData] = useState<{
    greetingMessage: string
    greetingActive: boolean
  }>({
    greetingMessage: '',
    greetingActive: false
  })

  // جلب البيانات عند التحميل
  useEffect(() => {
    const fetchGreetingData = async () => {
      try {
        const response = await axiosServices.get(`/api/sessions/${sessionId}/greeting`)
        setGreetingData({
          greetingMessage: response.data.greetingMessage,
          greetingActive: response.data.greetingActive
        })
      } catch (error) {
        console.error('Error fetching greeting data:', error)
      }
    }
    fetchGreetingData()
  }, [sessionId])

  // تحديث الإعدادات
  const handleGreetingUpdate = async () => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/greeting/update`, {
        greetingMessage: greetingData.greetingMessage,
        greetingActive: greetingData.greetingActive
      })
      alert(t('GreetingTab.alerts.updateSuccess'))
    } catch (error) {
      console.error('Error updating greeting:', error)
      alert(t('GreetingTab.alerts.updateError'))
    }
  }

  return (
    <Box>
      <TextField
        label={t('GreetingTab.fields.greetingMessage')}
        fullWidth
        multiline
        rows={3}
        value={greetingData.greetingMessage}
        onChange={e =>
          setGreetingData({ ...greetingData, greetingMessage: e.target.value })
        }
        sx={{ mt: 2 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={greetingData.greetingActive}
            onChange={e =>
              setGreetingData({ ...greetingData, greetingActive: e.target.checked })
            }
          />
        }
        label={t('GreetingTab.fields.enableGreeting')}
        sx={{ mt: 2 }}
      />
      <Box mt={2}>
        <Button variant='contained' onClick={handleGreetingUpdate}>
          {t('GreetingTab.buttons.save')}
        </Button>
      </Box>
    </Box>
  )
}

export default GreetingTab
