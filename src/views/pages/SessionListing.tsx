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

// مكون لتحرير رقم الواتساب البديل داخل جدول الجلسات
interface AlternateWhatsAppEditorProps {
  session: SessionType
  onUpdate: (sessionId: number, newAlternate: string) => void
  onAlert: (message: string, severity: AlertColor) => void
}

const AlternateWhatsAppEditor: React.FC<AlternateWhatsAppEditorProps> = ({ session, onUpdate, onAlert }) => {
  const [value, setValue] = useState(session.alternateWhatsAppNumber || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await axiosServices.post(`/api/sessions/${session.id}/alternate-whatsapp`, {
        alternateWhatsAppNumber: value
      })
      onUpdate(session.id, value)
      onAlert('تم تحديث الرقم بنجاح', 'success')
    } catch (error) {
      console.error('Error updating alternate WhatsApp number', error)
      onAlert('حدث خطأ أثناء تحديث الرقم', 'error')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <TextField
        value={value}
        onChange={(e) => setValue(e.target.value)}
        size="small"
        variant="outlined"
        placeholder="أدخل الرقم"
        sx={{ width: '150px' }}
      />
      <Button onClick={handleUpdate} variant="contained" size="small" disabled={isUpdating} sx={{ ml: 1 }}>
        Save
      </Button>
    </Box>
  )
}

const SessionListing = () => {
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

      showAlert('New session created with status Paid. Awaiting manager confirmation.', 'success')

      setPaymentDialogOpen(false)
      setSelectedPlan(null)
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error creating paid session:', error)
      showAlert('Failed to create paid session.', 'error')
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

      showAlert(`Session #${sessionId} is now Paid. Awaiting manager confirmation.`, 'success')

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
      showAlert('An error occurred while logging out the session.', 'error')
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

  // دالة تحديث رقم الـ alternate في الـ redux state بعد نجاح التعديل
  const handleAlternateUpdate = (sessionId: number, newAlternate: string) => {
    dispatch(updateSession({ sessionId, changes: { alternateWhatsAppNumber: newAlternate } }))
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
              <TableCell>Alternate WhatsApp</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align='right'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => {
              // حالات مختلفة للاختصار
              const isExpired = session.status === 'Expired'
              const isRejected = session.status === 'Payment Rejected'
              const isPaid = session.status === 'Paid'
              const isReady = session.status === 'Ready'
              const isTerminated = session.status === 'Terminated'
              const isStoppedByAdmin = session.status === 'Stopped by Admin'

              // لو الجلسة Expired نعطل باقي الأزرار باستثناء زر "Renew"
              // ولو الجلسة Stopped by Admin نعطل باقي الأزرار باستثناء دلالتها
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
                          Renew
                        </Button>
                      </Box>
                    ) : /* 2) لو الجلسة Payment Rejected */
                    isRejected ? (
                      <Box>
                        <Button variant='contained' color='secondary' onClick={() => handleBuyAgain(session)}>
                          Buy Again
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
                    ) : /* 3) لو الجلسة Paid => Awaiting Manager Confirmation */
                    isPaid ? (
                      <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                        <Chip label='Awaiting Manager Confirmation' color='warning' />
                        <IconButton aria-label='delete' color='error' onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : /* 4) لو الجلسة Stopped by Admin */
                    isStoppedByAdmin ? (
                      <Box>
                        <Chip label='Stopped by Admin' color='error' />
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
                        {session.status !== 'Terminated' && (
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

      {/* Dialog لاختيار الخطة (جلسة جديدة) */}
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

      {/* Dialog للدفع (جلسة جديدة) */}
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

      {/* Dialog لاختيار الخطة (لجلسة قائمة: BuyAgain أو Renew) */}
      <Dialog open={reactivateDialogOpen} onClose={() => setReactivateDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Choose a Plan</DialogTitle>
        <DialogContent>
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
