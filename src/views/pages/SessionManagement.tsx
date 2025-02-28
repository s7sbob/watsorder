// src/views/pages/SessionManagement.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axiosServices from 'src/utils/axios';

interface Session {
  id: number;
  sessionIdentifier: string;
  clientName: string; // تم استبدال userId بـ clientName
  status: string;
  subscriptionType: string;
  expireDate: string | null;
  phoneNumber: string | null;
}

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [newExpireDate, setNewExpireDate] = useState('');

  const fetchSessions = async () => {
    try {
      const response = await axiosServices.get('/api/sessions');
      // نتوقع من الـ API أن يُعيد لكل جلسة الخاصية clientName
      setSessions(response.data);
      setFilteredSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // دالة لتصفية الجلسات بناءً على البحث وحالة الجلسة
  useEffect(() => {
    let temp = sessions;
    if (searchQuery) {
      temp = temp.filter(session =>
        session.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.subscriptionType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'All') {
      temp = temp.filter(session => session.status === statusFilter);
    }
    setFilteredSessions(temp);
  }, [searchQuery, statusFilter, sessions]);

  // عند الضغط على زر "Confirm Payment" (Force Confirm)
  const handleForceConfirm = (session: Session) => {
    setSelectedSession(session);
    setNewExpireDate(''); // إعادة تعيين القيمة
    setOpenConfirmDialog(true);
  };

  // عند تأكيد الدفع مع إدخال expire date
  const handleConfirmPayment = async () => {
    if (!selectedSession || !newExpireDate) {
      alert('Please enter the expire date.');
      return;
    }
    try {
      await axiosServices.post(`/api/sessions/${selectedSession.id}/confirm-payment-with-expire`, { newExpireDate });
      setOpenConfirmDialog(false);
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Error confirming payment with expire date:', error);
      alert('Error confirming payment.');
    }
  };

  // زر Renew لتجديد الاشتراك عند انتهاء الصلاحية
  const handleRenewSubscription = async (sessionId: number) => {
    const newExpire = prompt("Enter new expire date (YYYY-MM-DD):");
    if (!newExpire) return;
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/renew-subscription`, { newExpireDate: newExpire });
      fetchSessions();
    } catch (error) {
      console.error('Error renewing subscription:', error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Session Management (Manager)
      </Typography>

      {/* شريط البحث وخيارات التصفية */}
      <Box display="flex" alignItems="center" mb={2} gap={2}>
        <TextField
          label="Search by Client Name or Plan"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <TextField
          select
          label="Filter by Status"
          variant="outlined"
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Waiting for Payment">Waiting for Payment</MenuItem>
          <MenuItem value="Paid">Paid</MenuItem>
          <MenuItem value="Ready">Ready</MenuItem>
          <MenuItem value="Connected">Connected</MenuItem>
          <MenuItem value="Expired">Expired</MenuItem>
          <MenuItem value="Waiting for QR Code">Waiting for QR Code</MenuItem>
        </TextField>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Session ID</TableCell>
              <TableCell>Client Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Expire Date</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>{session.id}</TableCell>
                <TableCell>{session.clientName}</TableCell>
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
                        : session.status === 'Expired'
                        ? 'error'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{session.subscriptionType || 'Not Chosen'}</TableCell>
                <TableCell>{session.expireDate || 'N/A'}</TableCell>
                <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                <TableCell align="center">
                  {(session.status === 'Waiting for Payment' || session.status === 'Paid') && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleForceConfirm(session)}
                    >
                      Confirm Payment
                    </Button>
                  )}
                  {session.status === 'Expired' && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      onClick={() => handleRenewSubscription(session.id)}
                    >
                      Renew
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog لطلب إدخال expire date عند تأكيد الدفع */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Payment & Set Expire Date</DialogTitle>
        <DialogContent>
          <TextField
            label="Expire Date (YYYY-MM-DD)"
            type="date"
            fullWidth
            value={newExpireDate}
            onChange={(e) => setNewExpireDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmPayment} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManagement;
