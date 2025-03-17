// src/views/.... /SessionListing.tsx
// (هذا هو الملف الذي وضعته في سؤالك. سأعرضه بالكامل مع تعديلات بسيطة)

// الملاحظات على أماكن التعديل موضحة في الكومنتات

import { useEffect, useState } from 'react'
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TableContainer,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  AlertColor,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import { fetchSessions, updateSession } from 'src/store/apps/sessions/SessionSlice'
import { SessionType } from 'src/types/apps/session'
import { useDispatch, useSelector } from 'src/store/Store'
import axiosServices from 'src/utils/axios'
import socket from 'src/socket'
import { useNavigate } from 'react-router'

// المكونات الخاصة بالخطط والدفع
import PricingCard from 'src/components/frontend-pages/shared/pricing/PricingCard'
import PaymentInstructions from 'src/views/pages/PaymentInstructions'

// i18n
import { useTranslation } from 'react-i18next'

/* ============= مكوّن تعديل رقم الواتساب البديل ============= */
interface AlternateWhatsAppEditorProps {
  session: SessionType
  onUpdate: (sessionId: number, newAlternate: string) => void
  onAlert: (message: string, severity: AlertColor) => void
}

const AlternateWhatsAppEditor: React.FC<AlternateWhatsAppEditorProps> = ({ session, onUpdate, onAlert }) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(session.alternateWhatsAppNumber || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await axiosServices.post(`/api/sessions/${session.id}/alternate-whatsapp`, {
        alternateWhatsAppNumber: value
      })
      onUpdate(session.id, value)
      onAlert(t('SessionListing.messages.numberUpdateSuccess'), 'success')
    } catch (error) {
      console.error('Error updating alternate WhatsApp number', error)
      onAlert(t('SessionListing.messages.numberUpdateError'), 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <TextField
        value={value}
        onChange={e => setValue(e.target.value)}
        size='small'
        variant='outlined'
        placeholder={t('SessionListing.alternateWhatsAppEditor.placeholder') ?? ''}
        sx={{ width: '150px' }}
      />
      <Button onClick={handleUpdate} variant='contained' size='small' disabled={isUpdating} sx={{ ml: 1 }}>
        {t('SessionListing.alternateWhatsAppEditor.save')}
      </Button>
    </Box>
  )
}

/* ============= المكوّن الرئيسي لعرض الجلسات ============= */
const SessionListing = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const sessions = useSelector(state => state.sessionReducer.sessions) as SessionType[]

  // ==================== Snackbar ====================
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success')

  const showAlert = (message: string, severity: AlertColor = 'success') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false)
  }

  // ==================== حالة حوار الـ QR ====================
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)

  // ==================== Socket ====================
  useEffect(() => {
    socket.on('sessionUpdate', (data: { sessionId: number; status: string; qrCode?: string }) => {
      // 1) حدث تحديث في إحدى الجلسات => نحدث الـ Redux
      dispatch(
        updateSession({
          sessionId: data.sessionId,
          changes: { status: data.status, qrCode: data.qrCode }
        })
      )

      // 2) إذا النافذة مفتوحة على نفس الـ sessionId => نحدث selectedSession
      if (selectedSession && selectedSession.id === data.sessionId) {
        setSelectedSession(prev => {
          if (!prev) return prev
          return {
            ...prev,
            status: data.status,
            qrCode: data.qrCode
          }
        })
      }
    })

    return () => {
      socket.off('sessionUpdate')
    }
  }, [dispatch, selectedSession])

  // ==================== Fetch Sessions ====================
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // ==================== فتح الـ QR Code Dialog ====================
  const handleShowQr = async (session: SessionType) => {
    try {
      // نجلب آخر QR من السيرفر
      const response = await axiosServices.get(`/api/sessions/${session.id}/qr`)
      const qrData = response.data.qr

      setSelectedSession({ ...session, qrCode: qrData })
      setQrDialogOpen(true)
    } catch (error) {
      console.error('Error fetching QR code:', error)
      showAlert(t('SessionListing.messages.failedToFetchQr'), 'error')
    }
  }

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false)
    setSelectedSession(null)
  }

  // ==================== حوار الدفع العام ====================
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null)
  const [pendingSessionPlan, setPendingSessionPlan] = useState<string | null>(null)

  // فتح حوار الدفع إذا الحالة Waiting for Payment
  const handlePayForWaitingSession = (session: SessionType) => {
    setPendingSessionId(session.id)
    setPendingSessionPlan(session.planType || '')
    setPaymentDialogOpen(true)
  }

  const handlePaymentDoneForExistingSession = () => {
    setPaymentDialogOpen(false)
    setPendingSessionId(null)
    setPendingSessionPlan(null)
    dispatch(fetchSessions())
  }

  // ==================== Buy Plan لجلسة جديدة (Free trial أو Waiting for Payment) ====================
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const handleOpenPlanDialog = () => {
    setPlanDialogOpen(true)
  }

  const handlePlanChosenForNewSession = async (plan: string) => {
    try {
      const response = await axiosServices.post('/api/sessions/create-paid-session', {
        planType: plan
      })
      const data = response.data
      showAlert(data.message, 'success')
      setPlanDialogOpen(false)

      // إذا الجلسة التي أنشئت بحاجة لدفع
      if (data.message?.includes('Please proceed with payment')) {
        setPendingSessionId(data.session.id)
        setPendingSessionPlan(data.session.planType)
        setPaymentDialogOpen(true)
      }

      dispatch(fetchSessions())
    } catch (error: any) {
      console.error('Error creating paid session:', error)
      showAlert(t('SessionListing.messages.createSessionError'), 'error')
      setPlanDialogOpen(false)
    }
  }

  // ==================== Buy Again / Renew لجلسة قديمة (Expired أو Rejected) ====================
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [reactivatePaymentDialogOpen, setReactivatePaymentDialogOpen] = useState(false)
  const [reactivateSession, setReactivateSession] = useState<SessionType | null>(null)
  const [reactivateSelectedPlan, setReactivateSelectedPlan] = useState<string | null>(null)

  const handleBuyAgain = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  const handleRenew = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  const handlePlanChosenForExistingSession = (plan: string) => {
    setReactivateSelectedPlan(plan)
    setReactivateDialogOpen(false)
    setReactivatePaymentDialogOpen(true)
  }

  const handlePaymentDoneForReactivateSession = async () => {
    if (!reactivateSession || !reactivateSelectedPlan) return
    const sessionId = reactivateSession.id
    const planType = reactivateSelectedPlan

    try {
      // 1) اختيار الخطة => الحالة تصبح "Waiting for Payment"
      await axiosServices.post(`/api/sessions/${sessionId}/choose-plan`, { planType })
      // 2) بعد الدفع => "sendToManager" => تصبح "Paid"
      await axiosServices.post(`/api/sessions/${sessionId}/send-to-manager`)

      showAlert(
        t('SessionListing.messages.reactivateSuccess', { sessionId: sessionId.toString() }),
        'success'
      )

      setReactivateSession(null)
      setReactivateSelectedPlan(null)
      setReactivatePaymentDialogOpen(false)
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error re-activating session:', error)
      showAlert(t('SessionListing.messages.reactivateError'), 'error')
    }
  }

  // ==================== Bot Toggles ====================
  const handleToggleBot = async (session: SessionType) => {
    const newBotActive = !session.botActive
    try {
      await axiosServices.post(`/api/sessions/${session.id}/bot/update`, { botActive: newBotActive })
      dispatch(updateSession({ sessionId: session.id, changes: { botActive: newBotActive } }))
      showAlert(
        t('SessionListing.messages.botUpdated', {
          status: newBotActive ? 'ON' : 'OFF',
          sessionId: session.id.toString()
        }),
        'info'
      )
    } catch (error) {
      console.error('Error toggling bot:', error)
      showAlert(t('SessionListing.messages.botToggleError'), 'error')
    }
  }

  const handleToggleMenuBot = async (session: SessionType) => {
    const newMenuBotActive = !session.menuBotActive
    try {
      await axiosServices.post(`/api/sessions/${session.id}/menu-bot/update`, { menuBotActive: newMenuBotActive })
      dispatch(updateSession({ sessionId: session.id, changes: { menuBotActive: newMenuBotActive } }))
      showAlert(
        t('SessionListing.messages.menuBotUpdated', {
          status: newMenuBotActive ? 'ON' : 'OFF',
          sessionId: session.id.toString()
        }),
        'info'
      )
    } catch (error) {
      console.error('Error toggling menu bot:', error)
      showAlert(t('SessionListing.messages.menuBotToggleError'), 'error')
    }
  }

  // ==================== Logout & Delete & Login ====================
  const handleLogoutSession = async (session: SessionType) => {
    const confirmation = window.confirm(
      t('SessionListing.messages.confirmLogout', { sessionId: session.id.toString() }) ?? ''
    )
    if (!confirmation) return

    try {
      await axiosServices.post(`/api/sessions/${session.id}/logout`)
      dispatch(updateSession({ sessionId: session.id, changes: { status: 'Terminated', qrCode: undefined } }))
      showAlert(
        t('SessionListing.messages.sessionLoggedOut', { sessionId: session.id.toString() }),
        'info'
      )
    } catch (error) {
      console.error('Error logging out session:', error)
      showAlert(t('SessionListing.messages.logoutError'), 'error')
    }
  }

  // دالة تسجيل الدخول مجددًا (إذا الحالة Terminated)
  const handleLoginSession = async (session: SessionType) => {
    try {
      await axiosServices.post(`/api/sessions/${session.id}/login`)
      showAlert(t('SessionListing.messages.sessionLoggedIn', { sessionId: session.id.toString() }), 'success')
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error logging in session:', error)
      showAlert(t('SessionListing.messages.loginError'), 'error')
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    const confirmation = window.confirm(
      t('SessionListing.messages.confirmDelete', { sessionId: sessionId.toString() }) ?? ''
    )
    if (!confirmation) return

    try {
      await axiosServices.post(`/api/sessions/${sessionId}/delete`)
      showAlert(t('SessionListing.messages.deleteSuccess'), 'success')
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error deleting session:', error)
      showAlert(t('SessionListing.messages.deleteError'), 'error')
    }
  }

  const handleAlternateUpdate = (sessionId: number, newAlternate: string) => {
    dispatch(updateSession({ sessionId, changes: { alternateWhatsAppNumber: newAlternate } }))
  }

  // ==================== Render ====================
  return (
    <Box mt={4}>
      {/* زر جلسة جديدة */}
      <Button variant='contained' color='primary' onClick={handleOpenPlanDialog} sx={{ mt: 2 }}>
        {t('SessionListing.buttons.buyPlan')}
      </Button>

      <TableContainer sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('SessionListing.columns.id')}</TableCell>
              <TableCell>{t('SessionListing.columns.plan')}</TableCell>
              <TableCell>{t('SessionListing.columns.expireDate')}</TableCell>
              <TableCell>{t('SessionListing.columns.phoneNumber')}</TableCell>
              <TableCell>{t('SessionListing.columns.alternateWhatsApp')}</TableCell>
              <TableCell>{t('SessionListing.columns.status')}</TableCell>
              <TableCell align='right'>{t('SessionListing.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map(session => {
              const isExpired = session.status === 'Expired'
              const isRejected = session.status === 'Payment Rejected'
              const isPaid = session.status === 'Paid'
              const isReady = session.status === 'Ready'
              const isStoppedByAdmin = session.status === 'Stopped by Admin'
              const isWaitingForPayment = session.status === 'Waiting for Payment'
              const isTerminated = session.status === 'Terminated'

              // تحويل expireDate إلى صيغة YYYY-MM-DD دون وقت
              const expireDateDisplay = session.expireDate
                ? new Date(session.expireDate).toISOString().slice(0, 10)
                : 'N/A'

              return (
                <TableRow key={session.id}>
                  <TableCell>{session.id}</TableCell>
                  <TableCell>{session.planType || 'N/A'}</TableCell>
                  <TableCell>{expireDateDisplay}</TableCell>
                  <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <AlternateWhatsAppEditor
                      session={session}
                      onUpdate={handleAlternateUpdate}
                      onAlert={showAlert}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.status}
                      color={
                        isReady
                          ? 'success'
                          : isPaid
                          ? 'warning'
                          : isRejected || isExpired || isStoppedByAdmin
                          ? 'error'
                          : 'primary'
                      }
                    />
                  </TableCell>
                  <TableCell align='right'>
                    {/*
                      ====== الحالة Waiting for Payment => زر Pay ======
                    */}
                    {isWaitingForPayment ? (
                      <Box>
                        <Button
                          variant='contained'
                          color='warning'
                          onClick={() => handlePayForWaitingSession(session)}
                        >
                          {t('SessionListing.buttons.payNow')}
                        </Button>
                      </Box>
                    ) : isExpired ? (
                      <Box>
                        <Button variant='contained' color='info' onClick={() => handleRenew(session)}>
                          {t('SessionListing.buttons.renew')}
                        </Button>
                      </Box>
                    ) : isRejected ? (
                      <Box>
                        <Button variant='contained' color='secondary' onClick={() => handleBuyAgain(session)}>
                          {t('SessionListing.buttons.buyAgain')}
                        </Button>
                        <IconButton
                          aria-label='delete'
                          color='error'
                          onClick={() => handleDeleteSession(session.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : isPaid ? (
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={t('SessionListing.chipLabels.pending')} color='warning' />
                        <IconButton
                          aria-label='delete'
                          color='error'
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : isStoppedByAdmin ? (
                      <Box>
                        <Chip label={t('SessionListing.chipLabels.stoppedByAdmin')} color='error' />
                        <IconButton
                          aria-label='delete'
                          color='error'
                          onClick={() => handleDeleteSession(session.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : isTerminated ? (
                      <>
                        {/* زر Login لإعادة تشغيل الجلسة */}
                        <Button variant='contained' size='small' onClick={() => handleLoginSession(session)}>
                          {t('SessionListing.buttons.login')}
                        </Button>
                        <IconButton
                          aria-label='delete'
                          color='error'
                          onClick={() => handleDeleteSession(session.id)}
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    ) : (
                      // الحالات الأخرى (Ready, Waiting for QR Code, ...)
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        {session.status === 'Waiting for QR Code' && (
                          <Button variant='outlined' size='small' onClick={() => handleShowQr(session)}>
                            {t('SessionListing.buttons.showQRCode')}
                          </Button>
                        )}

                        <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color='primary'>
                          <SettingsIcon />
                        </IconButton>

                        {/* Bot Toggle */}
                        <Button
                          variant='contained'
                          color={session.botActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleBot(session)}
                        >
                          {session.botActive
                            ? t('SessionListing.buttons.botOff')
                            : t('SessionListing.buttons.botOn')}
                        </Button>

                        {/* Menu Bot Toggle */}
                        <Button
                          variant='contained'
                          color={session.menuBotActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleMenuBot(session)}
                        >
                          {session.menuBotActive
                            ? t('SessionListing.buttons.menuBotOff')
                            : t('SessionListing.buttons.menuBotOn')}
                        </Button>

                        {/* Logout */}
                        {session.status !== 'Terminated' && (
                          <Button variant='outlined' size='small' onClick={() => handleLogoutSession(session)}>
                            {t('SessionListing.buttons.logout')}
                          </Button>
                        )}

                        {/* Delete */}
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog لاختيار الخطة (جلسة جديدة) */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.chooseYourPlanNew')}</DialogTitle>
        <DialogContent>
          <PricingCard onPlanChosen={handlePlanChosenForNewSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)} color='inherit'>
            {t('SessionListing.buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog الدفع (لجلسات Waiting for Payment) */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.paymentInstructions')}</DialogTitle>
        <DialogContent>
          {pendingSessionId && pendingSessionPlan && (
            <PaymentInstructions
              sessionId={pendingSessionId}
              planType={pendingSessionPlan}
              onDone={handlePaymentDoneForExistingSession}
              onAlert={(msg, severity) => showAlert(msg, severity)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog لاختيار الخطة (لجلسة قائمة: BuyAgain أو Renew) */}
      <Dialog open={reactivateDialogOpen} onClose={() => setReactivateDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.chooseAPlan')}</DialogTitle>
        <DialogContent>
          <PricingCard onPlanChosen={handlePlanChosenForExistingSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivateDialogOpen(false)} color='inherit'>
            {t('SessionListing.buttons.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog للدفع (BuyAgain أو Renew) */}
      <Dialog
        open={reactivatePaymentDialogOpen}
        onClose={() => setReactivatePaymentDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('SessionListing.dialogTitles.paymentInstructions')}</DialogTitle>
        <DialogContent>
          <PaymentInstructions
            sessionId={reactivateSession?.id ?? 0}
            planType={reactivateSelectedPlan || ''}
            onDone={handlePaymentDoneForReactivateSession}
            onAlert={(msg, severity) => showAlert(msg, severity)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivatePaymentDialogOpen(false)} color='inherit'>
            {t('SessionListing.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog لعرض QR Code */}
      <Dialog open={qrDialogOpen} onClose={handleCloseQrDialog}>
        <DialogTitle>{t('SessionListing.messages.scanQrCode')}</DialogTitle>
        <DialogContent>
          {selectedSession && selectedSession.qrCode ? (
            <Box
              component='img'
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                selectedSession.qrCode
              )}`}
              alt='QR Code'
            />
          ) : (
            <div>{t('SessionListing.messages.loadingQrCode')}</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog} color='primary'>
            {t('SessionListing.buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant='filled'>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default SessionListing
