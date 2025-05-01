// src/views/pages/session/EcommerceTab.tsx
import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material'
import { useNavigate } from 'react-router-dom'            // ← import
import axios from 'src/utils/axios'
import { useTranslation } from 'react-i18next'

interface Props {
  sessionId: number
}

const EcommerceTab: React.FC<Props> = ({ sessionId }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()                          // ← hook
  const [loading, setLoading] = useState(true)
  const [ecomOn, setEcomOn] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [about, setAbout] = useState('')
  const [sessionLogo, setsessionLogo] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [newFile, setNewFile] = useState<File | null>(null)

  useEffect(() => {
    axios
      .get(`/api/sessions/${sessionId}/settings`)
      .then(({ data }) => {
        setEcomOn(!!data.ecommerceActive)
        setDisplayName(data.sessionDisplayName || '')
        setAbout(data.sessionAbout || '')
        setsessionLogo(data.sessionLogo ? data.sessionLogo : null)
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (!ecomOn) {
    return (
      <Typography color="error">
        {t('SessionSettings.enableEcomFirst')}
      </Typography>
    )
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setNewFile(e.target.files[0])
      setRemoveLogo(false)
    }
  }

  const handleSave = async () => {
    const form = new FormData()
    form.append('ecommerceActive', '1')
    form.append('sessionDisplayName', displayName)
    form.append('sessionAbout', about)
    form.append('removeLogo', removeLogo ? '1' : '0')
    if (newFile) form.append('sessionLogo', newFile)

    try {
      await axios.post(
        `/api/sessions/${sessionId}/settings`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      if (newFile) {
        setsessionLogo(URL.createObjectURL(newFile))
        setNewFile(null)
      }
      alert(t('SessionSettings.saved'))
    } catch {
      alert(t('SessionSettings.errorSaving'))
    }
  }

  return (
    <Box>
      {/* ← NEW BUTTON */}
      <Button
        variant="outlined"
        sx={{ mb: 2 }}
        onClick={() => navigate(`/${encodeURIComponent(displayName)}`)}
      >
        {t('SessionSettings.visitStore', { name: displayName })}
      </Button>

      {/* existing fields… */}
      <TextField
        label={t('SessionSettings.displayName')}
        fullWidth
        margin="dense"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
      />

      <TextField
        label={t('SessionSettings.about')}
        fullWidth
        margin="dense"
        multiline
        rows={3}
        value={about}
        onChange={e => setAbout(e.target.value)}
      />

      {sessionLogo && !removeLogo && (
        <Box textAlign="center" mt={2}>
          <Typography variant="subtitle2">
            {t('SessionSettings.currentLogo')}
          </Typography>
          <img
            src={sessionLogo}
            alt="logo"
            style={{ maxWidth: 200, marginTop: 8 }}
          />
        </Box>
      )}

      {sessionLogo && (
        <FormControlLabel
          control={
            <Switch
              checked={removeLogo}
              onChange={(_, v) => setRemoveLogo(v)}
            />
          }
          label={t('SessionSettings.removeLogo')}
          sx={{ mt: 1 }}
        />
      )}

      <Box mt={2}>
        <Button variant="contained" component="label">
          {t('SessionSettings.uploadNewLogo')}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={onFileChange}
          />
        </Button>
        {newFile && (
          <Typography variant="caption" sx={{ ml: 2 }}>
            {newFile.name}
          </Typography>
        )}
      </Box>

      <Box mt={4}>
        <Button variant="contained" onClick={handleSave}>
          {t('SessionSettings.save')}
        </Button>
      </Box>
    </Box>
  )
}

export default EcommerceTab
