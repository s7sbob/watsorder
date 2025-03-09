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

// مكونات الخطة والدفع
import PricingCard from 'src/components/frontend-pages/shared/pricing/PricingCard'
import PaymentInstructions from 'src/views/pages/PaymentInstructions'

// i18n
import { useTranslation } from 'react-i18next'

// مكون لتحرير رقم الواتساب البديل داخل جدول الجلسات
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

const SessionListing = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const sessions = useSelector((state) => state.sessionReducer.sessions) as SessionType[]

  // ============== Snackbar ==============
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

  // ============== Socket: استقبال التحديثات ==============
  useEffect(() => {
    socket.on('sessionUpdate', (data: { sessionId: number; status: string; qrCode?: string }) => {
      dispatch(
        updateSession({
          sessionId: data.sessionId,
          changes: { status: data.status, qrCode: data.qrCode }
        })
      )
    })
    return () => {
      socket.off('sessionUpdate')
    }
  }, [dispatch])

  // ============== جلب الجلسات عند التحميل ==============
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // ============== إنشاء جلسة جديدة مدفوعة (Buy Plan) ==============
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handleOpenPlanDialog = () => {
    setPlanDialogOpen(true)
  }

  // عندما يختار المستخدم خطة لجلسة جديدة
  const handlePlanChosenForNewSession = (plan: string) => {
    setSelectedPlan(plan)
    setPlanDialogOpen(false)
    setPaymentDialogOpen(true)
  }

  // عند الضغط "I have paid" لإنشاء جلسة جديدة
  const handlePaymentDoneForNewSession = async () => {
    if (!selectedPlan) return
    try {
      await axiosServices.post('/api/sessions/create-paid-session', {
        planType: selectedPlan
      })

      showAlert(t('SessionListing.messages.createSessionSuccess'), 'success')
      setPaymentDialogOpen(false)
      setSelectedPlan(null)
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error creating paid session:', error)
      showAlert(t('SessionListing.messages.createSessionError'), 'error')
    }
  }

  // ============== Buy Again / Renew لجلسة موجودة ==============
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [reactivatePaymentDialogOpen, setReactivatePaymentDialogOpen] = useState(false)
  const [reactivateSession, setReactivateSession] = useState<SessionType | null>(null)
  const [reactivateSelectedPlan, setReactivateSelectedPlan] = useState<string | null>(null)

  // "Buy Again" لجلسة حالتها Payment Rejected
  const handleBuyAgain = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  // "Renew" لجلسة حالتها Expired
  const handleRenew = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  // بعد اختيار الخطة لجلسة قائمة
  const handlePlanChosenForExistingSession = (plan: string) => {
    setReactivateSelectedPlan(plan)
    setReactivateDialogOpen(false)
    setReactivatePaymentDialogOpen(true)
  }

  // عند الضغط "I have paid" لجلسة قائمة
  const handlePaymentDoneForExistingSession = async () => {
    if (!reactivateSession || !reactivateSelectedPlan) return
    const sessionId = reactivateSession.id
    const planType = reactivateSelectedPlan

    try {
      // 1) اختيار الخطة => الحالة تصبح "Waiting for Payment"
      await axiosServices.post(`/api/sessions/${sessionId}/choose-plan`, {
        planType
      })
      // 2) بعد الدفع => ترسل للمدير => تصبح "Paid"
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

  // ============== QR Code Dialog ==============
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)

  const handleShowQr = async (session: SessionType) => {
    try {
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

  // ============== Bot Toggles ==============
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

  // ============== Logout & Delete ==============
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

  // دالة تحديث رقم الـ alternate في الـ redux state بعد نجاح التعديل
  const handleAlternateUpdate = (sessionId: number, newAlternate: string) => {
    dispatch(updateSession({ sessionId, changes: { alternateWhatsAppNumber: newAlternate } }))
  }

  // ============== رندر الجدول ==============
  return (
    <Box mt={4}>
      {/* زر جلسة جديدة مدفوعة */}
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

              // لو الجلسة Expired نعطل باقي الأزرار باستثناء زر "Renew"
              const actionsDisabled = isExpired || isStoppedByAdmin

              return (
                <TableRow key={session.id}>
                  <TableCell>{session.id}</TableCell>
                  <TableCell>{session.planType || 'N/A'}</TableCell>
                  <TableCell>{session.expireDate || 'N/A'}</TableCell>
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
                    {/* 1) لو الجلسة Expired */}
                    {isExpired ? (
                      // زر "Renew"
                      <Box>
                        <Button variant='contained' color='info' onClick={() => handleRenew(session)}>
                          {t('SessionListing.buttons.renew')}
                        </Button>
                      </Box>
                    ) : isRejected ? (
                      // 2) لو الجلسة Payment Rejected
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
                      // 3) لو الجلسة Paid => Awaiting Manager Confirmation
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={t('SessionListing.chipLabels.pending')} color='warning' />
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : isStoppedByAdmin ? (
                      // 4) لو الجلسة Stopped by Admin
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
                    ) : (
                      // 5) الحالات الأخرى (Ready, Waiting for QR Code, ...)
                      <Box
                        sx={{
                          display: 'inline-flex',
                          gap: 1,
                          alignItems: 'center',
                          ...(actionsDisabled && { filter: 'blur(2px)', pointerEvents: 'none' })
                        }}
                      >
                        <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color='primary'>
                          <SettingsIcon />
                        </IconButton>
                        {session.status === 'Waiting for QR Code' && (
                          <Button variant='outlined' size='small' onClick={() => handleShowQr(session)}>
                            {t('SessionListing.buttons.showQRCode')}
                          </Button>
                        )}
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

      {/* Dialog للدفع (جلسة جديدة) */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.paymentInstructionsNew')}</DialogTitle>
        <DialogContent>
          <PaymentInstructions onDone={handlePaymentDoneForNewSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} color='inherit'>
            {t('SessionListing.buttons.close')}
          </Button>
          <Button variant='contained' color='primary' onClick={handlePaymentDoneForNewSession}>
            {t('SessionListing.buttons.iHavePaid')}
          </Button>
        </DialogActions>
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
          <PaymentInstructions onDone={handlePaymentDoneForExistingSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivatePaymentDialogOpen(false)} color='inherit'>
            {t('SessionListing.buttons.close')}
          </Button>
          <Button variant='contained' color='primary' onClick={handlePaymentDoneForExistingSession}>
            {t('SessionListing.buttons.iHavePaid')}
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
