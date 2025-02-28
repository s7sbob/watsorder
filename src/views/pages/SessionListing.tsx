// src/pages/SessionListing.tsx

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
  DialogActions
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

// نفس الصفحة المعتادة مع تعديلات تلبي الطلبات
const SessionListing = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const sessions = useSelector((state) => state.sessionReducer.sessions) as SessionType[]

  // Snackbar
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

  // Socket.io
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

  // جلب الجلسات
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

  // هذه الدالة خاصة بـ "جلسة جديدة"
  const handlePlanChosenForNewSession = (plan: string) => {
    setSelectedPlan(plan)
    setPlanDialogOpen(false)
    setPaymentDialogOpen(true)
  }

  const handlePaymentDoneForNewSession = async () => {
    if (!selectedPlan) return

    try {
      // استدعاء الراوت الخاص بإنشاء جلسة جديدة مدفوعة
      await axiosServices.post('/api/sessions/create-paid-session', {
        planType: selectedPlan
      })

      showAlert('New session created with status Paid. Awaiting manager confirmation.', 'success')

      setPaymentDialogOpen(false)
      setSelectedPlan(null)

      // إعادة جلب الجلسات
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error creating paid session:', error)
      showAlert('Failed to create paid session.', 'error')
    }
  }

  // ============== إعادة الدفع لجلسة موجودة (Payment Rejected) أو (Expired) ==============
  // نحتاج state للاحتفاظ بالجلسة التي ننوي إعادة الدفع أو التجديد لها
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [reactivatePaymentDialogOpen, setReactivatePaymentDialogOpen] = useState(false)
  const [reactivateSession, setReactivateSession] = useState<SessionType | null>(null)
  const [reactivateSelectedPlan, setReactivateSelectedPlan] = useState<string | null>(null)

  const handleBuyAgain = (session: SessionType) => {
    // فتح حوار اختيار الخطة لإعادة المحاولة على نفس الجلسة
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  const handleRenew = (session: SessionType) => {
    // نفس الفكرة
    setReactivateSession(session)
    setReactivateDialogOpen(true)
  }

  // عندما يختار خطة جديدة لجلسة موجودة
  const handlePlanChosenForExistingSession = (plan: string) => {
    setReactivateSelectedPlan(plan)
    setReactivateDialogOpen(false)
    // فتح نافذة الدفع
    setReactivatePaymentDialogOpen(true)
  }

  // عند الضغط "I have paid" لجلسة موجودة
  const handlePaymentDoneForExistingSession = async () => {
    if (!reactivateSession || !reactivateSelectedPlan) return
    const sessionId = reactivateSession.id
    const planType = reactivateSelectedPlan

    try {
      // 1) اختيار الخطة => الحالة تصبح "Waiting for Payment"
      await axiosServices.post(`/api/sessions/${sessionId}/choose-plan`, {
        planType
      })
      // 2) بعد الدفع => نطلب إرسال الجلسة للمدير => تصبح "Paid"
      await axiosServices.post(`/api/sessions/${sessionId}/send-to-manager`)

      showAlert(`Session #${sessionId} is now Paid. Awaiting manager confirmation.`, 'success')

      // إغلاق النوافذ وإفراغ الـ states
      setReactivateSession(null)
      setReactivateSelectedPlan(null)
      setReactivatePaymentDialogOpen(false)

      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error re-activating session:', error)
      showAlert('Failed to re-activate session.', 'error')
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
      showAlert('Failed to fetch QR code.', 'error')
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
      showAlert(`Bot is now ${newBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info')
    } catch (error) {
      console.error('Error toggling bot:', error)
      showAlert('An error occurred while toggling the bot.', 'error')
    }
  }

  const handleToggleMenuBot = async (session: SessionType) => {
    const newMenuBotActive = !session.menuBotActive
    try {
      await axiosServices.post(`/api/sessions/${session.id}/menu-bot/update`, { menuBotActive: newMenuBotActive })
      dispatch(updateSession({ sessionId: session.id, changes: { menuBotActive: newMenuBotActive } }))
      showAlert(`Menu Bot is now ${newMenuBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info')
    } catch (error) {
      console.error('Error toggling menu bot:', error)
      showAlert('An error occurred while toggling the Menu Bot.', 'error')
    }
  }

  // ============== Logout & Delete ==============
  const handleLogoutSession = async (session: SessionType) => {
    if (!window.confirm(`Are you sure you want to logout from session ID: ${session.id}?`)) return
    try {
      await axiosServices.post(`/api/sessions/${session.id}/logout`)
      dispatch(updateSession({ sessionId: session.id, changes: { status: 'Terminated', qrCode: undefined } }))
      showAlert(`Session ${session.id} has been logged out.`, 'info')
    } catch (error) {
      console.error('Error logging out session:', error)
      showAlert('An error occurred while logging out.', 'error')
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm(`Are you sure you want to delete the session with ID: ${sessionId}?`)) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/delete`)
      showAlert('Session deleted successfully.', 'success')
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error deleting session:', error)
      showAlert('An error occurred while deleting the session.', 'error')
    }
  }

  // ============== رندر الجدول ==============
  return (
    <Box mt={4}>
      {/* زر جلسة جديدة مدفوعة */}
      <Button variant='contained' color='primary' onClick={handleOpenPlanDialog} sx={{ mt: 2 }}>
        Buy Plan
      </Button>

      <TableContainer sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Expire Date</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align='right'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => {
              const isExpired = session.status === 'Expired'
              const isRejected = session.status === 'Payment Rejected'
              const isPaid = session.status === 'Paid'
              const isReady = session.status === 'Ready'
              const isTerminated = session.status === 'Terminated'

              // لو الجلسة Expired نريد تعطيل (blur) جميع الأزرار ماعدا زر "Renew"
              // أسهل طريقة: إما بالـ CSS أو منع النقر. هنا سنستخدم خاصية `disabled` أو `sx={{ filter: 'blur(2px)' }}`.
              const actionsDisabled = isExpired

              return (
                <TableRow key={session.id}>
                  <TableCell>{session.id}</TableCell>
                  <TableCell>{session.planType || 'N/A'}</TableCell>
                  <TableCell>{session.expireDate || 'N/A'}</TableCell>
                  <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={session.status}
                      color={
                        isReady
                          ? 'success'
                          : isPaid
                          ? 'warning'
                          : isRejected
                          ? 'error'
                          : isExpired
                          ? 'error'
                          : 'primary'
                      }
                    />
                  </TableCell>
                  <TableCell align='right'>
                    {isExpired ? (
                      // زر "Renew"
                      <Box>
                        <Button
                          variant='contained'
                          color='info'
                          onClick={() => handleRenew(session)}
                        >
                          Renew
                        </Button>
                      </Box>
                    ) : isRejected ? (
                      // زر "Buy Again"
                      <Box>
                        <Button
                          variant='contained'
                          color='secondary'
                          onClick={() => handleBuyAgain(session)}
                        >
                          Buy Again
                        </Button>
                        {/* زر Delete (اختياري) */}
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
                      // لو الحالة Paid => Awaiting Manager Confirmation
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        <Chip label='Awaiting Manager Confirmation' color='warning' />
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      // حالات أخرى (Ready, Waiting for QR Code, ...)
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
                            Show QR Code
                          </Button>
                        )}
                        {/* Bot Toggle */}
                        <Button
                          variant='contained'
                          color={session.botActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleBot(session)}
                        >
                          {session.botActive ? 'Bot OFF' : 'Bot ON'}
                        </Button>
                        {/* Menu Bot Toggle */}
                        <Button
                          variant='contained'
                          color={session.menuBotActive ? 'success' : 'warning'}
                          size='small'
                          onClick={() => handleToggleMenuBot(session)}
                        >
                          {session.menuBotActive ? 'Menu Bot OFF' : 'Menu Bot ON'}
                        </Button>
                        {/* Logout */}
                        {!isTerminated && (
                          <Button variant='outlined' size='small' onClick={() => handleLogoutSession(session)}>
                            Logout
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

      {/* Dialog لاختيار الخطة (New Session) */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Choose Your Plan (New Session)</DialogTitle>
        <DialogContent>
          <PricingCard onPlanChosen={handlePlanChosenForNewSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)} color='inherit'>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog للدفع (New Session) */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Payment Instructions (New Session)</DialogTitle>
        <DialogContent>
          <PaymentInstructions onDone={handlePaymentDoneForNewSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} color='inherit'>
            Close
          </Button>
          <Button variant='contained' color='primary' onClick={handlePaymentDoneForNewSession}>
            I have paid
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog لاختيار الخطة (لجلسة موجودة: BuyAgain أو Renew) */}
      <Dialog open={reactivateDialogOpen} onClose={() => setReactivateDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Choose a Plan</DialogTitle>
        <DialogContent>
          {/* عند اختيار الخطة, نستدعي handlePlanChosenForExistingSession */}
          <PricingCard onPlanChosen={handlePlanChosenForExistingSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivateDialogOpen(false)} color='inherit'>
            Cancel
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
        <DialogTitle>Payment Instructions</DialogTitle>
        <DialogContent>
          <PaymentInstructions onDone={handlePaymentDoneForExistingSession} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReactivatePaymentDialogOpen(false)} color='inherit'>
            Close
          </Button>
          <Button variant='contained' color='primary' onClick={handlePaymentDoneForExistingSession}>
            I have paid
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog لعرض QR Code */}
      <Dialog open={qrDialogOpen} onClose={handleCloseQrDialog}>
        <DialogTitle>Scan QR Code</DialogTitle>
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
            <div>Loading QR Code...</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog} color='primary'>
            Close
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
