// src/pages/SessionListing.tsx

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchSessions, createSession, updateSession } from 'src/store/apps/sessions/SessionSlice';
import { SessionType } from 'src/types/apps/session';
import { useDispatch, useSelector } from 'src/store/Store';
import axiosServices from 'src/utils/axios';
import socket from 'src/socket';
import { useNavigate } from 'react-router';

// نستورد مكونات النافذة المنبثقة
import PricingCard from 'src/components/frontend-pages/shared/pricing/PricingCard';
import PaymentInstructions from 'src/views/pages/PaymentInstructions';

const SessionListing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const sessions = useSelector((state) => state.sessionReducer.sessions) as SessionType[];
  const maxSessionsReached = useSelector((state) => state.sessionReducer.maxSessionsReached) as boolean;

  // حالة إنشاء جلسة جديدة
  const [sessionData, setSessionData] = useState({
    status: '',
    greetingMessage: '',
    greetingActive: false
  });

  // Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  const showAlert = (message: string, severity: AlertColor = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // استقبال تحديثات الجلسات عبر Socket.io
  useEffect(() => {
    socket.on('sessionUpdate', (data: { sessionId: number; status: string; qrCode?: string }) => {
      dispatch(
        updateSession({
          sessionId: data.sessionId,
          changes: { status: data.status, qrCode: data.qrCode }
        })
      );
    });
    return () => {
      socket.off('sessionUpdate');
    };
  }, [dispatch]);

  // جلب الجلسات عند التحميل
  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  // إنشاء جلسة جديدة
  const handleCreateSession = async () => {
    if (maxSessionsReached) {
      showAlert('Maximum sessions limit reached.', 'warning');
      return;
    }
    try {
      await dispatch(createSession(sessionData));
      setSessionData({ status: '', greetingMessage: '', greetingActive: false });
      dispatch(fetchSessions());
      showAlert('Session created successfully.', 'success');
    } catch (error) {
      showAlert('Failed to create session.', 'error');
    }
  };

  // منطق الـ QR Code
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);

  const handleShowQr = async (session: SessionType) => {
    try {
      const response = await axiosServices.get(`/api/sessions/${session.id}/qr`);
      const qrData = response.data.qr;
      setSelectedSession({ ...session, qrCode: qrData });
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      showAlert('Failed to fetch QR code.', 'error');
    }
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
    setSelectedSession(null);
  };

  // تفعيل/إيقاف البوت
  const handleToggleBot = async (session: SessionType) => {
    const newBotActive = !session.botActive;
    try {
      await axiosServices.post(`/api/sessions/${session.id}/bot/update`, { botActive: newBotActive });
      dispatch(updateSession({ sessionId: session.id, changes: { botActive: newBotActive } }));
      showAlert(`Bot is now ${newBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info');
    } catch (error) {
      console.error('Error toggling bot:', error);
      showAlert('An error occurred while toggling the bot.', 'error');
    }
  };

  // تفعيل/إيقاف المنيو بوت
  const handleToggleMenuBot = async (session: SessionType) => {
    const newMenuBotActive = !session.menuBotActive;
    try {
      await axiosServices.post(`/api/sessions/${session.id}/menu-bot/update`, { menuBotActive: newMenuBotActive });
      dispatch(updateSession({ sessionId: session.id, changes: { menuBotActive: newMenuBotActive } }));
      showAlert(`Menu Bot is now ${newMenuBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info');
    } catch (error) {
      console.error('Error toggling menu bot:', error);
      showAlert('An error occurred while toggling the Menu Bot.', 'error');
    }
  };

  // تسجيل الخروج
  const handleLogoutSession = async (session: SessionType) => {
    if (!window.confirm(`Are you sure you want to logout from session ID: ${session.id}?`)) return;
    try {
      await axiosServices.post(`/api/sessions/${session.id}/logout`);
      dispatch(updateSession({ sessionId: session.id, changes: { status: 'Terminated', qrCode: undefined } }));
      showAlert(`Session ${session.id} has been logged out.`, 'info');
    } catch (error) {
      console.error('Error logging out session:', error);
      showAlert('An error occurred while logging out.', 'error');
    }
  };

  // حذف الجلسة (زر الحذف يبقى مفعل دائماً)
  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm(`Are you sure you want to delete the session with ID: ${sessionId}?`)) return;
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/delete`);
      showAlert('Session deleted successfully.', 'success');
      dispatch(fetchSessions());
    } catch (error) {
      console.error('Error deleting session:', error);
      showAlert('An error occurred while deleting the session.', 'error');
    }
  };

  // ============================
  // Dialog لاختيار الخطة (PricingCard)
  // ============================
  const [openPlanDialog, setOpenPlanDialog] = useState(false);
  const [planSession, setPlanSession] = useState<SessionType | null>(null);

  const handleChoosePlanClick = (session: SessionType) => {
    setPlanSession(session);
    setOpenPlanDialog(true);
  };

  // بعد اختيار الخطة من PricingCard: تحديث الحالة إلى "Waiting for Payment"
  const handlePlanChosen = (sessionId: number) => {
    dispatch(updateSession({ sessionId, changes: { status: 'Waiting for Payment' } }));
    setOpenPlanDialog(false);
    showAlert(`Plan chosen for session #${sessionId}. Now waiting for payment.`, 'info');
  };

  // ============================
  // Dialog لصفحة الدفع (PaymentInstructions)
  // ============================
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentSession, setPaymentSession] = useState<SessionType | null>(null);

  const handlePaymentInstructionsClick = (session: SessionType) => {
    setPaymentSession(session);
    setOpenPaymentDialog(true);
  };

  // عند الضغط على "I have paid – Send to the Manager"
  const handlePaymentDone = async () => {
    if (!paymentSession) return;
    try {
      await axiosServices.post(`/api/sessions/${paymentSession.id}/send-to-manager`);
      dispatch(updateSession({ sessionId: paymentSession.id, changes: { status: 'Paid' } }));
      setOpenPaymentDialog(false);
      showAlert(`Session ${paymentSession.id} marked as Paid. Manager will now confirm it.`, 'info');
    } catch (error) {
      console.error('Error sending session to manager:', error);
      showAlert('Error sending session to manager.', 'error');
    }
  };

  // في حالة "Paid" للعميل لا يُعرض زر التأكيد، بل يتم عرض مؤشر "Awaiting Manager Confirmation"
  return (
    <Box mt={4}>
      <Button variant="contained" color="primary" onClick={handleCreateSession} sx={{ mt: 2 }}>
        Create Session
      </Button>

      <TableContainer sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{session.id}</TableCell>
                <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={session.status}
                    color={
                      session.status === 'Ready'
                        ? 'success'
                        : session.status === 'Waiting for Payment'
                        ? 'warning'
                        : session.status === 'Paid'
                        ? 'warning'
                        : 'primary'
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  {session.status === 'Waiting for Plan' ? (
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <Box
                        sx={{
                          filter: 'blur(3px) brightness(0.7)',
                          pointerEvents: 'none',
                          display: 'inline-flex',
                          gap: 1,
                          alignItems: 'center'
                        }}
                      >
                        <IconButton color="primary">
                          <SettingsIcon />
                        </IconButton>
                        <Button variant="outlined" size="small">
                          Show QR Code
                        </Button>
                        <Button variant="contained" color="warning" size="small">
                          Bot ON
                        </Button>
                        <Button variant="contained" color="warning" size="small">
                          Menu Bot ON
                        </Button>
                        <Button variant="outlined" size="small">
                          Logout
                        </Button>
                        <IconButton aria-label="delete" color="error" onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Button variant="contained" color="secondary" onClick={() => handleChoosePlanClick(session)}>
                          Choose Plan
                        </Button>
                      </Box>
                    </Box>
                  ) : session.status === 'Waiting for Payment' ? (
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <Box
                        sx={{
                          filter: 'blur(3px) brightness(0.7)',
                          pointerEvents: 'none',
                          display: 'inline-flex',
                          gap: 1,
                          alignItems: 'center'
                        }}
                      >
                        <IconButton color="primary">
                          <SettingsIcon />
                        </IconButton>
                        <Button variant="outlined" size="small">
                          Show QR Code
                        </Button>
                        <Button variant="contained" color="warning" size="small">
                          Bot ON
                        </Button>
                        <Button variant="contained" color="warning" size="small">
                          Menu Bot ON
                        </Button>
                        <Button variant="outlined" size="small">
                          Logout
                        </Button>
                        <IconButton aria-label="delete" color="error" onClick={() => handleDeleteSession(session.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ textAlign: 'center', mt: 1 }}>
                        <Button variant="contained" color="primary" onClick={() => handlePaymentInstructionsClick(session)}>
                          Payment Instructions
                        </Button>
                      </Box>
                    </Box>
                  ) : session.status === 'Paid' ? (
                    // هنا لا يُعرض زر "Confirm Session" للعميل، بل مؤشر بأنه "Awaiting Manager Confirmation"
                    <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                      <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color="primary">
                        <SettingsIcon />
                      </IconButton>
                      <Chip label="Awaiting Manager Confirmation" color="warning" />
                      <IconButton aria-label="delete" color="error" onClick={() => handleDeleteSession(session.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
                      <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color="primary">
                        <SettingsIcon />
                      </IconButton>
                      {session.status === 'Waiting for QR Code' && (
                        <Button variant="outlined" size="small" onClick={() => handleShowQr(session)}>
                          Show QR Code
                        </Button>
                      )}
                      <Button
                        variant="contained"
                        color={session.botActive ? 'success' : 'warning'}
                        size="small"
                        onClick={() => handleToggleBot(session)}
                      >
                        {session.botActive ? 'Bot OFF' : 'Bot ON'}
                      </Button>
                      <Button
                        variant="contained"
                        color={session.menuBotActive ? 'success' : 'warning'}
                        size="small"
                        onClick={() => handleToggleMenuBot(session)}
                      >
                        {session.menuBotActive ? 'Menu Bot OFF' : 'Menu Bot ON'}
                      </Button>
                      {session.status !== 'Terminated' && (
                        <Button variant="outlined" size="small" onClick={() => handleLogoutSession(session)}>
                          Logout
                        </Button>
                      )}
                      <IconButton aria-label="delete" color="error" onClick={() => handleDeleteSession(session.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog لعرض QR Code */}
      <Dialog open={qrDialogOpen} onClose={handleCloseQrDialog}>
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          {selectedSession && selectedSession.qrCode ? (
            <Box
              component="img"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedSession.qrCode)}`}
              alt="QR Code"
            />
          ) : (
            <div>Loading QR Code...</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog لعرض صفحة اختيار الخطة (PricingCard) */}
      <Dialog open={openPlanDialog} onClose={() => setOpenPlanDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Choose Your Plan</DialogTitle>
        <DialogContent>
          {planSession && (
            <PricingCard sessionId={planSession.id} onPlanChosen={handlePlanChosen} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlanDialog(false)} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog لعرض صفحة الدفع (PaymentInstructions) */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Instructions</DialogTitle>
        <DialogContent>
          {paymentSession && (
            <PaymentInstructions onDone={handlePaymentDone} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)} color="inherit">
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
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SessionListing;
