// src/components/SessionListing.tsx
import React, { useEffect, useState } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, TableContainer, Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchSessions, createSession } from 'src/store/apps/sessions/SessionSlice';
import { SessionType } from 'src/types/apps/session';
import { useDispatch, useSelector } from 'src/store/Store';

const SessionListing = () => {
  const dispatch = useDispatch();
  const sessions = useSelector((state) => state.sessionReducer.sessions) as SessionType[];
  const maxSessionsReached = useSelector((state) => state.sessionReducer.maxSessionsReached) as boolean;

  const [sessionData, setSessionData] = useState({
    status: '',
    category: '',
    products: '',
    keywords: '',
  });

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  const handleCreateSession = async () => {
    if (maxSessionsReached) {
      alert('Maximum sessions limit reached.');
      return;
    }
    try {
      await dispatch(createSession(sessionData));
      setSessionData({ status: '', category: '', products: '', keywords: '' });
    } catch (error) {
      alert('Failed to create session.');
    }
  };

  const handleShowQr = (session: SessionType) => {
    setSelectedSession(session);
    setQrDialogOpen(true);
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
    setSelectedSession(null);
  };

  const toggleStatus = (session: SessionType) => {
    const updatedStatus = session.status === 'Active' ? 'Inactive' : 'Active';
    session.status = updatedStatus;
    // للتحديث الحقيقي، يجب استدعاء API لتحديث الحالة ثم جلب البيانات من جديد.
  };

  const handleDeleteSession = (sessionId: number) => {
    alert(`حذف الجلسة بالمعرف: ${sessionId}`);
    // هنا يمكنك إضافة منطق حذف الجلسة عبر API وتحديث الحالة
  };

  return (
    <Box mt={4}>
      <TextField
        label="Status"
        value={sessionData.status}
        onChange={(e) => setSessionData({ ...sessionData, status: e.target.value })}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="contained" color="primary" onClick={handleCreateSession}>
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
                <TableCell>{session.phoneNumber}</TableCell>
                <TableCell>
                  <Chip label={session.status} color="primary" />
                </TableCell>
                <TableCell align="right">
                  {session.status === 'Waiting for QR Code' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleShowQr(session)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Show QR Code
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => toggleStatus(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {session.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="outlined" size="small" sx={{ mr: 1, mb: 1 }}>
                    Add Category
                  </Button>
                  <Button variant="outlined" size="small" sx={{ mr: 1, mb: 1 }}>
                    Add Products
                  </Button>
                  <Button variant="outlined" size="small" sx={{ mr: 1, mb: 1 }}>
                    Keywords
                  </Button>
                  <IconButton
                    aria-label="delete"
                    color="error"
                    onClick={() => handleDeleteSession(session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={qrDialogOpen} onClose={handleCloseQrDialog}>
        <DialogTitle>Scan QR Code</DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box
              component="img"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedSession.sessionIdentifier}`}
              alt="QR Code"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionListing;
