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

  // Socket.io للاستماع لتحديثات الجلسات
  useEffect(() => {
    socket.on('sessionUpdate', (data: { sessionId: number; status: string; qrCode?: string }) => {
      dispatch(
        updateSession({
          sessionId: data.sessionId,
          changes: {
            status: data.status,
            qrCode: data.qrCode
          }
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

  // ============================
  // إضافة منطق الـ QR Code
  // ============================
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);

  const handleShowQr = async (session: SessionType) => {
    try {
      // نفترض أن المسار التالي يرجع بيانات QR على شكل { qr: "some_data" }
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

  // إجراءات تشغيل/إيقاف البوت
  const handleToggleBot = async (session: SessionType) => {
    const newBotActive = !session.botActive;
    try {
      await axiosServices.post(`/api/sessions/${session.id}/bot/update`, { botActive: newBotActive });
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: { botActive: newBotActive }
        })
      );
      showAlert(`Bot is now ${newBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info');
    } catch (error) {
      console.error('Error toggling bot:', error);
      showAlert('An error occurred while toggling the bot.', 'error');
    }
  };

  const handleToggleMenuBot = async (session: SessionType) => {
    const newMenuBotActive = !session.menuBotActive;
    try {
      await axiosServices.post(`/api/sessions/${session.id}/menu-bot/update`, { menuBotActive: newMenuBotActive });
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: { menuBotActive: newMenuBotActive }
        })
      );
      showAlert(`Menu Bot is now ${newMenuBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info');
    } catch (error) {
      console.error('Error toggling menu bot:', error);
      showAlert('An error occurred while toggling the Menu Bot.', 'error');
    }
  };

  // تسجيل خروج الجلسة
  const handleLogoutSession = async (session: SessionType) => {
    if (!window.confirm(`Are you sure you want to logout from session ID: ${session.id}?`)) {
      return;
    }
    try {
      await axiosServices.post(`/api/sessions/${session.id}/logout`);
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: {
            status: 'Terminated',
            qrCode: undefined
          }
        })
      );
      showAlert(`Session ${session.id} has been logged out.`, 'info');
    } catch (error) {
      console.error('Error logging out session:', error);
      showAlert('An error occurred while logging out.', 'error');
    }
  };

  // حذف الجلسة
  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm(`Are you sure you want to delete the session with ID: ${sessionId}?`)) {
      return;
    }
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/delete`);
      showAlert('Session deleted successfully.', 'success');
      dispatch(fetchSessions());
    } catch (error) {
      console.error('Error deleting session:', error);
      showAlert('An error occurred while deleting the session.', 'error');
    }
  };

  return (
    <Box mt={4}>
      {/* أزرار إنشاء الجلسة وتوثيق الـ API */}
      <Button variant="contained" color="primary" onClick={handleCreateSession} sx={{ mt: 2 }}>
        Create Session
      </Button>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2, ml: 2 }}
        onClick={() => navigate('/api-docs')}
      >
        Open API Documentation
      </Button>

      {/* جدول الجلسات */}
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
                  <Chip label={session.status} color="primary" />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/sessions/${session.id}/settings`)} color="primary">
                    <SettingsIcon />
                  </IconButton>
                  {/* زر عرض QR Code يظهر فقط عندما تكون الحالة "Waiting for QR Code" */}
                  {session.status === 'Waiting for QR Code' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleShowQr(session)}
                      sx={{ ml: 1 }}
                    >
                      Show QR Code
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color={session.botActive ? 'success' : 'warning'}
                    size="small"
                    onClick={() => handleToggleBot(session)}
                    sx={{ ml: 1 }}
                  >
                    {session.botActive ? 'Bot OFF' : 'Bot ON'}
                  </Button>
                  <Button
                    variant="contained"
                    color={session.menuBotActive ? 'success' : 'warning'}
                    size="small"
                    onClick={() => handleToggleMenuBot(session)}
                    sx={{ ml: 1 }}
                  >
                    {session.menuBotActive ? 'Menu Bot OFF' : 'Menu Bot ON'}
                  </Button>
                  {session.status !== 'Terminated' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleLogoutSession(session)}
                      sx={{ ml: 1 }}
                    >
                      Logout
                    </Button>
                  )}
                  <IconButton
                    aria-label="delete"
                    color="error"
                    onClick={() => handleDeleteSession(session.id)}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
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
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                selectedSession.qrCode
              )}`}
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
