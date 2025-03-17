// src/views/pages/SessionManagement.tsx

import React, { useEffect, useState } from 'react'
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
  InputAdornment,
  IconButton
} from '@mui/material'
import { Search as SearchIcon, ImageSearch as ImageSearchIcon } from '@mui/icons-material'
import axiosServices from 'src/utils/axios'

interface Session {
  id: number
  sessionIdentifier: string
  clientName: string
  status: string
  planType: string
  expireDate: string | null
  phoneNumber: string | null
}

const SessionManagement: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  // ======= حوار تأكيد الدفع مع Expire Date =======
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [newExpireDate, setNewExpireDate] = useState('')

  // ======= حوار عرض إثبات الدفع =======
  const [openProofDialog, setOpenProofDialog] = useState(false)
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const response = await axiosServices.get('/api/sessions')
      setSessions(response.data)
      setFilteredSessions(response.data)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // تصفية النتائج عند تغير البحث أو الفلتر
  useEffect(() => {
    let temp = sessions
    if (searchQuery) {
      temp = temp.filter(session =>
        session.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.planType || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (statusFilter !== 'All') {
      temp = temp.filter(session => session.status === statusFilter)
    }
    setFilteredSessions(temp)
  }, [searchQuery, statusFilter, sessions])

  // ======= الدفع =========
  const handleForceConfirm = (session: Session) => {
    setSelectedSession(session)
    setNewExpireDate('')
    setOpenConfirmDialog(true)
  }

  const handleConfirmPayment = async () => {
    if (!selectedSession || !newExpireDate) {
      alert('Please enter the expire date.')
      return
    }
    try {
      await axiosServices.post(`/api/sessions/${selectedSession.id}/confirm-payment-with-expire`, {
        newExpireDate
      })
      setOpenConfirmDialog(false)
      setSelectedSession(null)
      fetchSessions()
    } catch (error) {
      console.error('Error confirming payment with expire date:', error)
      alert('Error confirming payment.')
    }
  }

  // زر رفض الدفع
  const handleRejectPayment = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/reject-payment`)
      fetchSessions()
    } catch (error) {
      console.error('Error rejecting payment:', error)
      alert('Error rejecting payment.')
    }
  }

  // زر تجديد الاشتراك
  const handleRenewSubscription = async (sessionId: number) => {
    const newExpire = prompt('Enter new expire date (YYYY-MM-DD):')
    if (!newExpire) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/renew-subscription`, {
        newExpireDate: newExpire
      })
      fetchSessions()
    } catch (error) {
      console.error('Error renewing subscription:', error)
    }
  }

  // ======= إيقاف الجلسة من قبل المدير (Force Pause) =======
  const handleForcePause = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to pause this session?')) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/force-pause`)
      fetchSessions()
    } catch (error) {
      console.error('Error pausing session:', error)
      alert('Error pausing session.')
    }
  }

  // ======= تشغيل الجلسة مجددًا (Force Start) =======
  const handleForceStart = async (sessionId: number) => {
    if (!window.confirm('Are you sure you want to start this session again?')) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/force-start`)
      fetchSessions()
    } catch (error) {
      console.error('Error starting session:', error)
      alert('Error starting session.')
    }
  }

  // ======= عرض إثبات الدفع =======
  const handleViewPaymentProof = async (sessionId: number) => {
    try {
      const res = await axiosServices.get(`/api/sessions/${sessionId}/payment-proof`)
  
      if (!res.data.hasProof) {
        alert('No payment proof found for this session.')
        return
      }
  
      // المسار النسبي للملف كما يعيده السيرفر
      const filePath = res.data.filePath || ''
      // ضمّه مع الـ baseURL للـ axios
      const baseURL = axiosServices.defaults.baseURL || ''
      // إذا لم يبدأ المسار بـ '/' ضفنا واحد
      const imageUrl = `${baseURL}${filePath.startsWith('/') ? filePath : `/${filePath}`}`
  
      setProofImageUrl(imageUrl)
      setOpenProofDialog(true)
    } catch (error) {
      console.error('Error fetching payment proof:', error)
      alert('Failed to fetch payment proof.')
    }
  }
  

  // تنسيق التاريخ فقط (YYYY-MM-DD)
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    // تحويل لسنة-شهر-يوم
    const dateObj = new Date(dateStr)
    return dateObj.toISOString().slice(0, 10) // فقط YYYY-MM-DD
  }

  return (
    <Box p={3}>
      <Typography variant='h4' gutterBottom>
        Session Management (Manager)
      </Typography>

      {/* شريط البحث */}
      <Box display='flex' alignItems='center' mb={2} gap={2}>
        <TextField
          label='Search by Client Name or Plan'
          variant='outlined'
          size='small'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <TextField
          select
          label='Filter by Status'
          variant='outlined'
          size='small'
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value='All'>All</MenuItem>
          <MenuItem value='Waiting for Payment'>Waiting for Payment</MenuItem>
          <MenuItem value='Paid'>Paid</MenuItem>
          <MenuItem value='Ready'>Ready</MenuItem>
          <MenuItem value='Connected'>Connected</MenuItem>
          <MenuItem value='Expired'>Expired</MenuItem>
          <MenuItem value='Terminated'>Terminated</MenuItem>
          <MenuItem value='Payment Rejected'>Payment Rejected</MenuItem>
          <MenuItem value='Stopped by Admin'>Stopped by Admin</MenuItem>
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
              <TableCell align='center'>Actions</TableCell>
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
                        : session.status === 'Paid'
                        ? 'warning'
                        : session.status === 'Expired'
                        ? 'error'
                        : session.status === 'Payment Rejected'
                        ? 'error'
                        : session.status === 'Stopped by Admin'
                        ? 'error'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{session.planType || 'Not Chosen'}</TableCell>
                <TableCell>{formatDate(session.expireDate)}</TableCell>
                <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                <TableCell align='center'>
                  {/* زر لفتح إثبات الدفع دائماً (أو يمكنك إظهاره فقط لو الحالة Paid أو غيره) */}
                  <IconButton
                    onClick={() => handleViewPaymentProof(session.id)}
                    title='View Payment Proof'
                  >
                    <ImageSearchIcon />
                  </IconButton>

                  {/* التأكيد أو الرفض عند Waiting for Payment أو Paid */}
                  {(session.status === 'Waiting for Payment' || session.status === 'Paid') && (
                    <>
                      <Button
                        variant='contained'
                        color='primary'
                        size='small'
                        onClick={() => handleForceConfirm(session)}
                        style={{ marginRight: 8, marginLeft: 8 }}
                      >
                        Confirm Payment
                      </Button>
                      <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        onClick={() => handleRejectPayment(session.id)}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {/* التجديد عند Expired */}
                  {session.status === 'Expired' && (
                    <Button
                      variant='outlined'
                      color='secondary'
                      size='small'
                      style={{ marginLeft: 8 }}
                      onClick={() => handleRenewSubscription(session.id)}
                    >
                      Renew
                    </Button>
                  )}

                  {/* زر Force Pause / Force Start */}
                  {session.status === 'Stopped by Admin' ? (
                    <Button
                      variant='contained'
                      color='success'
                      size='small'
                      style={{ marginLeft: 8 }}
                      onClick={() => handleForceStart(session.id)}
                    >
                      Force Start
                    </Button>
                  ) : (
                    <Button
                      variant='contained'
                      color='warning'
                      size='small'
                      style={{ marginLeft: 8 }}
                      onClick={() => handleForcePause(session.id)}
                    >
                      Force Pause
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* حوار تأكيد الدفع (إدخال Expire Date) */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Confirm Payment & Set Expire Date</DialogTitle>
        <DialogContent>
          <TextField
            label='Expire Date (YYYY-MM-DD)'
            type='date'
            fullWidth
            value={newExpireDate}
            onChange={(e) => setNewExpireDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color='inherit'>
            Cancel
          </Button>
          <Button onClick={handleConfirmPayment} variant='contained' color='primary'>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* حوار لعرض إثبات الدفع (صورة) */}
      <Dialog open={openProofDialog} onClose={() => setOpenProofDialog(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Payment Proof</DialogTitle>
        <DialogContent>
          {proofImageUrl ? (
            <Box
              component='img'
              src={proofImageUrl}
              alt='Payment Proof'
              sx={{ width: '100%', height: 'auto', mt: 1 }}
            />
          ) : (
            <Typography>No proof found.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProofDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SessionManagement
