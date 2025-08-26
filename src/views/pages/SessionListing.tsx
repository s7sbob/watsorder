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
  TextField,
  CircularProgress
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

interface SelectedPlan {
  planType: string
  billing: 'monthly' | 'yearly'
  price: number
}

const SessionListing = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const sessions = useSelector(state => state.sessionReducer.sessions) as SessionType[]

  // Snackbar للإشعارات
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

  // حالة QR Dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)
  const [isQrLoading, setIsQrLoading] = useState(false)

  // Socket listener مع شرط لإغلاق الـ popup تلقائيًا عند نجاح المسح
  useEffect(() => {
    const handleSessionUpdate = (data: { sessionId: number; status: string; qrCode?: string }) => {
      if (qrDialogOpen && selectedSession && selectedSession.id === data.sessionId) {
        setSelectedSession(prev =>
          prev ? { ...prev, status: data.status, qrCode: data.qrCode } : null
        )
        if (data.status === 'Connected') {
          // إغلاق الـ popup تلقائيًا عند اكتمال عملية المسح
          setQrDialogOpen(false)
          setSelectedSession(null)
        }
      }
      if (!qrDialogOpen && data.status !== 'Waiting for QR Code') {
        dispatch(updateSession({ sessionId: data.sessionId, changes: { status: data.status, qrCode: data.qrCode } }))
      }
    }

    socket.on('sessionUpdate', handleSessionUpdate)
    return () => {
      socket.off('sessionUpdate', handleSessionUpdate)
    }
  }, [dispatch, qrDialogOpen, selectedSession])

  // جلب الجلسات عند تحميل الصفحة
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // عند الضغط على زر "Link Whatsapp Device"
  const handleShowQr = async (session: SessionType) => {
    try {
      // تحديث حالة الجلسة محلياً
      const updatedSession = { ...session, status: 'Waiting for QR Code', qrCode: undefined }
      setSelectedSession(updatedSession)
      setQrDialogOpen(true)
      setIsQrLoading(true)

      // بدء عملية توليد QR عبر endpoint الجديد
      await axiosServices.post(`/api/sessions/${session.id}/start-qr`)

      // استرجاع رمز الـ QR
      const response = await axiosServices.get(`/api/sessions/${session.id}/qr`)
      const qrData = response.data.qr

      // عرض رمز الـ QR مع بقاء الحالة "Waiting for QR Code"
      setSelectedSession(prev => prev ? { ...prev, qrCode: qrData } : null)
      dispatch(updateSession({ sessionId: session.id, changes: { qrCode: qrData, status: 'Waiting for QR Code' } }))
      setIsQrLoading(false)
    } catch (error) {
      console.error('Error fetching QR code:', error)
      showAlert(t('SessionListing.messages.failedToFetchQr'), 'error')
      dispatch(updateSession({ sessionId: session.id, changes: { status: 'Ready', qrCode: undefined } }))
      setIsQrLoading(false)
      setQrDialogOpen(false)
      setSelectedSession(null)
    }
  }

  // عند إغلاق الـ QR dialog بدون إتمام المسح: استدعاء cancel-qr لإلغاء العملية
  const handleCloseQrDialog = async () => {
    if (selectedSession) {
      try {
        await axiosServices.post(`/api/sessions/${selectedSession.id}/cancel-qr`)
        showAlert(t('SessionListing.messages.cancelQrSuccess'), 'info')
        dispatch(fetchSessions())
      } catch (error) {
        console.error('Error cancelling QR generation:', error)
        showAlert(t('SessionListing.messages.cancelQrError'), 'error')
      }
    }
    setQrDialogOpen(false)
    setSelectedSession(null)
    setIsQrLoading(false)
  }

  // حالة Payment Dialog للجلسات المنتظرة للدفع
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null)
  const [pendingPlan, setPendingPlan] = useState<SelectedPlan | null>(null)

  const handlePayForWaitingSession = (session: SessionType) => {
    // في حالة الدفع للجلسة القائمة، نقوم هنا بتعيين الخطة يدويًا إذا كانت موجودة مسبقاً (حسب التطبيق)
    // هنا نفترض أنه يوجد حقل planType في الجلسة
    if (session.planType) {
      // يمكن تعديل هذه القيمة بناءً على ما هو موجود في الجلسة
      setPendingPlan({ planType: session.planType, billing: 'monthly', price: session.planType === 'All Features' ? 500 : 300 })
      setPendingSessionId(session.id)
      setPaymentDialogOpen(true)
    }
  }

  const handlePaymentDoneForExistingSession = () => {
    setPaymentDialogOpen(false)
    setPendingSessionId(null)
    setPendingPlan(null)
    dispatch(fetchSessions())
  }

  // حالة شراء خطة / إنشاء جلسة جديدة
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const handleOpenPlanDialog = () => {
    setPlanDialogOpen(true)
  }

  const handlePlanChosenForNewSession = async (selectedPlan: SelectedPlan) => {
    try {
      const response = await axiosServices.post('/api/sessions/create-paid-session', {
        planType: selectedPlan.planType,
        billing: selectedPlan.billing,
        amountPaid: selectedPlan.price
      })
      const data = response.data
      showAlert(data.message, 'success')
      setPlanDialogOpen(false)

      if (data.message?.includes('Please proceed with payment')) {
        setPendingSessionId(data.session.id)
        setPendingPlan(selectedPlan)
        setPaymentDialogOpen(true)
      }

      dispatch(fetchSessions())
    } catch (error: any) {
      console.error('Error creating paid session:', error)
      showAlert(t('SessionListing.messages.createSessionError'), 'error')
      setPlanDialogOpen(false)
    }
  }

  // Reactivate / Renew session
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [reactivatePaymentDialogOpen, setReactivatePaymentDialogOpen] = useState(false)
  const [reactivateSession, setReactivateSession] = useState<SessionType | null>(null)
  const [reactivatePlan, setReactivatePlan] = useState<SelectedPlan | null>(null)

  const handleBuyAgain = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  const handleRenew = (session: SessionType) => {
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  const handlePlanChosenForExistingSession = (selectedPlan: SelectedPlan) => {
    setReactivatePlan(selectedPlan)
    setReactivateDialogOpen(false)
    setReactivatePaymentDialogOpen(true)
  }

  const handlePaymentDoneForReactivateSession = async () => {
    if (!reactivateSession || !reactivatePlan) return
    const sessionId = reactivateSession.id
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/choose-plan`, { planType: reactivatePlan.planType, billing: reactivatePlan.billing })
      await axiosServices.post(`/api/sessions/${sessionId}/send-to-manager`)
      showAlert(t('SessionListing.messages.reactivateSuccess', { sessionId: sessionId.toString() }), 'success')
      setReactivateSession(null)
      setReactivatePlan(null)
      setReactivatePaymentDialogOpen(false)
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error re-activating session:', error)
      showAlert(t('SessionListing.messages.reactivateError'), 'error')
    }
  }

  // Bot Toggles and session actions
  const handleToggleBot = async (session: SessionType) => {
    const newBotActive = !session.botActive
    try {
      await axiosServices.post(`/api/sessions/${session.id}/bot/update`, { botActive: newBotActive })
      dispatch(updateSession({ sessionId: session.id, changes: { botActive: newBotActive } }))
      showAlert(t('SessionListing.messages.botUpdated', { status: newBotActive ? 'ON' : 'OFF', sessionId: session.id.toString() }), 'info')
    } catch (error) {
      console.error('Error toggling bot:', error)
      showAlert(t('SessionListing.messages.botToggleError'), 'error')
    }
  }

  // const handleToggleMenuBot = async (session: SessionType) => {
  //   const newMenuBotActive = !session.menuBotActive
  //   try {
  //     await axiosServices.post(`/api/sessions/${session.id}/menu-bot/update`, { menuBotActive: newMenuBotActive })
  //     dispatch(updateSession({ sessionId: session.id, changes: { menuBotActive: newMenuBotActive } }))
  //     showAlert(t('SessionListing.messages.menuBotUpdated', { status: newMenuBotActive ? 'ON' : 'OFF', sessionId: session.id.toString() }), 'info')
  //   } catch (error) {
  //     console.error('Error toggling menu bot:', error)
  //     showAlert(t('SessionListing.messages.menuBotToggleError'), 'error')
  //   }
  // }


  // const handleToggleEcommerce = async (session: SessionType) => {
  //   const newEcom = !session.ecommerceActive;
  //   try {
  //     await axiosServices.post(
  //       `/api/sessions/${session.id}/ecommerce/update`,
  //       { ecommerceActive: newEcom }
  //     );
  //     dispatch(
  //       updateSession({
  //         sessionId: session.id,
  //         changes: { ecommerceActive: newEcom }
  //       })
  //     );
  //     showAlert(
  //       t('SessionListing.messages.ecommerceUpdated', {
  //         status: newEcom ? 'ON' : 'OFF',
  //         sessionId: session.id.toString()
  //       }),
  //       'info'
  //     );
  //   } catch (err) {
  //     console.error('Error toggling e-commerce:', err);
  //     showAlert(t('SessionListing.messages.ecommerceToggleError'), 'error');
  //   }
  // };



  const handleLogoutSession = async (session: SessionType) => {
    const confirmation = window.confirm(t('SessionListing.messages.confirmLogout', { sessionId: session.id.toString() }) ?? '')
    if (!confirmation) return

    try {
      await axiosServices.post(`/api/sessions/${session.id}/logout`)
      dispatch(updateSession({ sessionId: session.id, changes: { status: 'Terminated', qrCode: undefined } }))
      showAlert(t('SessionListing.messages.sessionLoggedOut', { sessionId: session.id.toString() }), 'info')
    } catch (error) {
      console.error('Error logging out session:', error)
      showAlert(t('SessionListing.messages.logoutError'), 'error')
    }
  }

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
    const confirmation = window.confirm(t('SessionListing.messages.confirmDelete', { sessionId: sessionId.toString() }) ?? '')
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

  return (
    <Box mt={4}>
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
                    <AlternateWhatsAppEditor session={session} onUpdate={handleAlternateUpdate} onAlert={showAlert} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        session.status === 'Waiting for QR Code'
                          ? 'Waiting to Link a Whatsapp Device'
                          : session.status
                      }
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
                    {isWaitingForPayment ? (
                      <Box>
                        <Button variant='contained' color='warning' onClick={() => handlePayForWaitingSession(session)}>
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
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)}>
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
                        <Button variant='contained' size='small' onClick={() => handleLoginSession(session)}>
                          {t('SessionListing.buttons.login')}
                        </Button>
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)} sx={{ ml: 1 }}>
                          <DeleteIcon />
                        </IconButton>
                      </>
                    ) : (
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        {(session.status === 'Ready' || session.status === 'Waiting for QR Code') && (
                          <Button variant='outlined' size='small' onClick={() => handleShowQr(session)}>
                            Link Whatsapp Device
                          </Button>
                        )}
                        <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color='primary'>
                          <SettingsIcon />
                        </IconButton>
                        <Button
                          variant='contained'
                          color={session.botActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleBot(session)}
                        >
                          {session.botActive ? t('SessionListing.buttons.botOff') : t('SessionListing.buttons.botOn')}
                        </Button>
                        {/* <Button
                          variant='contained'
                          color={session.menuBotActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleMenuBot(session)}
                        >
                          {session.menuBotActive
                            ? t('SessionListing.buttons.menuBotOff')
                            : t('SessionListing.buttons.menuBotOn')}
                        </Button> */}
                        {/* <Button
      variant="contained"
      color={session.ecommerceActive ? 'success' : 'warning'}
      size="small"
      onClick={() => handleToggleEcommerce(session)}
    >
      {session.ecommerceActive
        ? t('SessionListing.buttons.ecomOff')
        : t('SessionListing.buttons.ecomOn')}
    </Button> */}
                        {session.status !== 'Terminated' && (
                          <Button variant='outlined' size='small' onClick={() => handleLogoutSession(session)}>
                            {t('SessionListing.buttons.logout')}
                          </Button>
                        )}
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

      {/* Dialog لإنشاء جلسة جديدة عبر شراء خطة */}
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

      {/* Dialog لتعليمات الدفع للجلسات المنتظرة */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.paymentInstructions')}</DialogTitle>
        <DialogContent>
          {pendingSessionId && pendingPlan && (
            <PaymentInstructions
              sessionId={pendingSessionId}
              selectedPlan={pendingPlan}
              onDone={handlePaymentDoneForExistingSession}
              onAlert={(msg, severity) => showAlert(msg, severity)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog لاختيار خطة لتجديد/إعادة تفعيل الجلسة */}
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

      {/* Dialog لتعليمات الدفع عند تجديد الجلسة */}
      <Dialog open={reactivatePaymentDialogOpen} onClose={() => setReactivatePaymentDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{t('SessionListing.dialogTitles.paymentInstructions')}</DialogTitle>
        <DialogContent>
          {reactivateSession && reactivatePlan && (
            <PaymentInstructions
              sessionId={reactivateSession.id}
              selectedPlan={reactivatePlan}
              onDone={handlePaymentDoneForReactivateSession}
              onAlert={(msg, severity) => showAlert(msg, severity)}
            />
          )}
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
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          {isQrLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress />
              <Box mt={2}>{t('SessionListing.messages.waitingForQrGeneration')}</Box>
            </Box>
          ) : selectedSession && selectedSession.qrCode ? (
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
