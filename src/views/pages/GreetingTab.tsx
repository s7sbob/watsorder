import React, { useState, useEffect } from 'react'
import { Box, FormControlLabel, Checkbox, Button, Typography } from '@mui/material'
import axiosServices from 'src/utils/axios'
import { useTranslation } from 'react-i18next'
import WhatsAppRichTextEditor from 'src/components/WhatsAppRichTextEditor'

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
  const [formattedMessage, setFormattedMessage] = useState('')

  // جلب البيانات عند التحميل
  useEffect(() => {
    const fetchGreetingData = async () => {
      try {
        const response = await axiosServices.get(`/api/sessions/${sessionId}/greeting`)
        setGreetingData({
          greetingMessage: response.data.greetingMessage || '',
          greetingActive: response.data.greetingActive || false
        })
        setFormattedMessage(response.data.greetingMessage || '')
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
        greetingMessage: formattedMessage, // إرسال النص المنسق
        greetingActive: greetingData.greetingActive
      })
      alert(t('GreetingTab.alerts.updateSuccess'))
    } catch (error) {
      console.error('Error updating greeting:', error)
      alert(t('GreetingTab.alerts.updateError'))
    }
  }

  const handleRichTextChange = (rawText: string, formatted: string) => {
    setGreetingData({ ...greetingData, greetingMessage: rawText })
    setFormattedMessage(formatted)
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('GreetingTab.title', 'رسالة الترحيب')}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        استخدم أدوات التنسيق لإنشاء رسالة ترحيب جميلة ومنسقة. يمكنك استخدام النص العريض والمائل والقوائم والمزيد.
      </Typography>

      <WhatsAppRichTextEditor
        value={greetingData.greetingMessage}
        onChange={handleRichTextChange}
        placeholder="اكتب رسالة الترحيب هنا... يمكنك استخدام التنسيق لجعلها أكثر جاذبية"
        maxLength={2000}
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
        label={t('GreetingTab.fields.enableGreeting', 'تفعيل رسالة الترحيب')}
        sx={{ mt: 2 }}
      />

      <Box mt={2}>
        <Button 
          variant='contained' 
          onClick={handleGreetingUpdate}
          disabled={!formattedMessage.trim()}
        >
          {t('GreetingTab.buttons.save', 'حفظ')}
        </Button>
      </Box>

      {/* معاينة الرسالة المحفوظة */}
      {formattedMessage && (
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            الرسالة التي ستُرسل:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              backgroundColor: '#fff',
              p: 1,
              borderRadius: 1,
              border: '1px solid #ddd'
            }}
          >
            {formattedMessage}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default GreetingTab

