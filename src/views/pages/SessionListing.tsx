// src/components/SessionListing.tsx

import { useEffect, useState } from 'react'
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  TableContainer,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
  AlertColor
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { fetchSessions, createSession, updateSession } from 'src/store/apps/sessions/SessionSlice'
import { SessionType } from 'src/types/apps/session'
import { useDispatch, useSelector } from 'src/store/Store'
import AddDataPopup from './AddDataPopup'
import axiosServices from 'src/utils/axios'
import CategoryList from './CategoryList'
import ProductList from './ProductList'
import socket from 'src/socket'

const SessionListing = () => {
  const dispatch = useDispatch()
  const sessions = useSelector((state) => state.sessionReducer.sessions) as SessionType[]
  const maxSessionsReached = useSelector((state) => state.sessionReducer.maxSessionsReached) as boolean

  // State for creating new session
  const [sessionData, setSessionData] = useState({
    status: '',
    category: '',
    products: '',
    keywords: ''
  })

  // QR Code dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)

  // Popups for adding data
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false)
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [keywordPopupOpen, setKeywordPopupOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  // Show existing categories / products
  const [showExistingCategories, setShowExistingCategories] = useState(false)
  const [showExistingProducts, setShowExistingProducts] = useState(false)
  const [selectedSessionForCategory, setSelectedSessionForCategory] = useState<SessionType | null>(null)
  const [selectedSessionForProduct, setSelectedSessionForProduct] = useState<SessionType | null>(null)

  // Categories for product form
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([])

  // Greeting dialog
  const [greetingDialogOpen, setGreetingDialogOpen] = useState(false)
  const [selectedSessionGreeting, setSelectedSessionGreeting] = useState<SessionType | null>(null)
  const [greetingData, setGreetingData] = useState({
    greetingMessage: '',
    greetingActive: false
  })

  // =============== [ Snackbar State for Alerts ] ===============
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success')

  // دالة لإظهار الـ Snackbar
  const showAlert = (message: string, severity: AlertColor = 'success') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false)
  }
  // =============================================================

  // Open greeting popup
  const openGreetingPopup = (session: SessionType) => {
    setSelectedSessionGreeting(session)
    setGreetingData({
      greetingMessage: session.greetingMessage || '',
      greetingActive: Boolean(session.greetingActive)
    })
    setGreetingDialogOpen(true)
  }

  // Close greeting dialog
  const handleCloseGreetingDialog = () => {
    setGreetingDialogOpen(false)
    setSelectedSessionGreeting(null)
  }

  // Save greeting
  const handleGreetingUpdate = async () => {
    if (!selectedSessionGreeting) return
    try {
      await axiosServices.put(`/api/sessions/${selectedSessionGreeting.id}/greeting`, {
        greetingMessage: greetingData.greetingMessage,
        greetingActive: greetingData.greetingActive
      })
      dispatch(
        updateSession({
          sessionId: selectedSessionGreeting.id,
          changes: {
            greetingMessage: greetingData.greetingMessage,
            greetingActive: greetingData.greetingActive
          }
        })
      )
      showAlert('Greeting message updated successfully.', 'success')
      setGreetingDialogOpen(false)
    } catch (error) {
      console.error('Error updating greeting:', error)
      showAlert('An error occurred while updating the greeting message.', 'error')
    }
  }

  // Socket.io to listen for session updates
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
      )
    })

    return () => {
      socket.off('sessionUpdate')
    }
  }, [dispatch])

  // fetch sessions on mount
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // create new session
  const handleCreateSession = async () => {
    if (maxSessionsReached) {
      showAlert('Maximum sessions limit reached.', 'warning')
      return
    }
    try {
      await dispatch(createSession(sessionData))
      setSessionData({ status: '', category: '', products: '', keywords: '' })
      dispatch(fetchSessions())
      showAlert('Session created successfully.', 'success')
    } catch (error) {
      showAlert('Failed to create session.', 'error')
    }
  }

  // show QR code
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

  // close QR dialog
  const handleCloseQrDialog = () => {
    setQrDialogOpen(false)
    setSelectedSession(null)
  }

  // Logout session
  const handleLogoutSession = async (session: SessionType) => {
    if (!window.confirm(`Are you sure you want to logout from session ID: ${session.id}?`)) {
      return
    }
    try {
      await axiosServices.put(`/api/sessions/${session.id}/logout`)
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: {
            status: 'Terminated',
            qrCode: undefined
          }
        })
      )
      showAlert(`Session ${session.id} has been logged out.`, 'info')
    } catch (error) {
      console.error('Error logging out session:', error)
      showAlert('An error occurred while logging out.', 'error')
    }
  }

  // Login session
  const handleLoginSession = async (session: SessionType) => {
    if (!window.confirm(`Login session ID: ${session.id} again? You will need to scan QR code again.`)) {
      return
    }
    try {
      await axiosServices.put(`/api/sessions/${session.id}/login`)
      showAlert(`Session ${session.id} is re-initializing. Please scan new QR code.`, 'info')
    } catch (error) {
      console.error('Error logging in session:', error)
      showAlert('An error occurred while logging in.', 'error')
    }
  }

  // Delete session completely
  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm(`Are you sure you want to delete the session with ID: ${sessionId}?`)) {
      return
    }
    try {
      await axiosServices.delete(`/api/sessions/${sessionId}`)
      showAlert('Session deleted successfully.', 'success')
      dispatch(fetchSessions())
    } catch (error) {
      console.error('Error deleting session:', error)
      showAlert('An error occurred while deleting the session.', 'error')
    }
  }

  // open popups
  const openCategoryPopup = (sessionId: number) => {
    setActiveSessionId(sessionId)
    setCategoryPopupOpen(true)
  }

  const openProductPopup = async (sessionId: number) => {
    setActiveSessionId(sessionId)
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`)
      const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }))
      setProductCategories(cats)
    } catch (error) {
      console.error(error)
    }
    setProductPopupOpen(true)
  }

  const openKeywordPopup = (sessionId: number) => {
    setActiveSessionId(sessionId)
    setKeywordPopupOpen(true)
  }

  // toggle bot on/off
  const handleToggleBot = async (session: SessionType) => {
    const newBotActive = !session.botActive
    try {
      await axiosServices.put(`/api/sessions/${session.id}/bot`, { botActive: newBotActive })
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: { botActive: newBotActive }
        })
      )
      showAlert(`Bot is now ${newBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info')
    } catch (error) {
      console.error('Error toggling bot:', error)
      showAlert('An error occurred while toggling the bot.', 'error')
    }
  }

  // submit category
  const submitCategory = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/category`, data)
      showAlert('Category added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding category.', 'error')
    }
  }

  // submit product
  const submitProduct = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/product`, data)
      showAlert('Product added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding product.', 'error')
    }
  }

  // submit keyword
  const submitKeyword = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/keyword`, data)
      showAlert('Keyword added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding keyword.', 'error')
    }
  }

  // open & close existing categories / products
  const openExistingCategories = () => {
    setSelectedSessionForCategory(null)
    setShowExistingCategories(true)
  }
  const closeExistingCategories = () => setShowExistingCategories(false)

  const openExistingProducts = () => {
    setSelectedSessionForProduct(null)
    setShowExistingProducts(true)
  }
  const closeExistingProducts = () => setShowExistingProducts(false)

  return (
    <Box mt={4}>
      <TextField
        label='Status'
        value={sessionData.status}
        onChange={e => setSessionData({ ...sessionData, status: e.target.value })}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant='contained' color='primary' onClick={handleCreateSession}>
        Create Session
      </Button>

      <TableContainer sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align='right'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map(session => (
              <TableRow key={session.id}>
                <TableCell>{session.id}</TableCell>
                <TableCell>{session.phoneNumber || 'N/A'}</TableCell>
                <TableCell>
                  <Chip label={session.status} color='primary' />
                </TableCell>
                <TableCell align='right'>
                  {session.status === 'Waiting for QR Code' && (
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => handleShowQr(session)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Show QR Code
                    </Button>
                  )}
                  {session.status !== 'Terminated' && (
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => handleLogoutSession(session)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Logout
                    </Button>
                  )}
                  {session.status === 'Terminated' && (
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => handleLoginSession(session)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Login
                    </Button>
                  )}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openCategoryPopup(session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Add Category
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openProductPopup(session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Add Product
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openKeywordPopup(session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Keywords
                  </Button>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openGreetingPopup(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Greeting
                  </Button>
                  <Button
                    variant='contained'
                    color={session.botActive ? 'success' : 'warning'}
                    size='small'
                    onClick={() => handleToggleBot(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {session.botActive ? 'Bot OFF' : 'Bot ON'}
                  </Button>
                  <IconButton
                    aria-label='delete'
                    color='error'
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

      <Button onClick={openExistingCategories} sx={{ mt: 2, mr: 2 }} variant='outlined'>
        Existing Categories
      </Button>
      <Button onClick={openExistingProducts} sx={{ mt: 2 }} variant='outlined'>
        Existing Products
      </Button>

      {/* QR Code Dialog */}
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

      {/* Add Category Popup */}
      <AddDataPopup
        open={categoryPopupOpen}
        onClose={() => setCategoryPopupOpen(false)}
        onSubmit={submitCategory}
        title='Add Category'
        fields={[{ label: 'Category Name', name: 'category_name' }]}
      />
      {/* Add Product Popup */}
      <AddDataPopup
        open={productPopupOpen}
        onClose={() => setProductPopupOpen(false)}
        onSubmit={submitProduct}
        title='Add Product'
        fields={[
          { label: 'Product Name', name: 'product_name' },
          { label: 'Category', name: 'category_id', options: productCategories }
        ]}
      />
      {/* Add Keyword Popup */}
      <AddDataPopup
        open={keywordPopupOpen}
        onClose={() => setKeywordPopupOpen(false)}
        onSubmit={submitKeyword}
        title='Add Keyword'
        fields={[
          { label: 'Keyword', name: 'keyword' },
          { label: 'Reply', name: 'reply' }
        ]}
      />

      {/* Existing Categories Dialog */}
      <Dialog open={showExistingCategories} onClose={closeExistingCategories} fullWidth maxWidth='sm'>
        <DialogTitle>Existing Categories</DialogTitle>
        <DialogContent>
          {!selectedSessionForCategory ? (
            <Box display='flex' flexDirection='column' gap={1}>
              {sessions.map(session => (
                <Button
                  key={session.id}
                  variant='outlined'
                  onClick={() => setSelectedSessionForCategory(session)}
                >
                  Session {session.id}
                </Button>
              ))}
            </Box>
          ) : (
            <CategoryList sessionId={selectedSessionForCategory.id} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExistingCategories}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Existing Products Dialog */}
      <Dialog open={showExistingProducts} onClose={closeExistingProducts} fullWidth maxWidth='sm'>
        <DialogTitle>Existing Products</DialogTitle>
        <DialogContent>
          {!selectedSessionForProduct ? (
            <Box display='flex' flexDirection='column' gap={1}>
              {sessions.map(session => (
                <Button
                  key={session.id}
                  variant='outlined'
                  onClick={() => setSelectedSessionForProduct(session)}
                >
                  Session {session.id}
                </Button>
              ))}
            </Box>
          ) : (
            <ProductList sessionId={selectedSessionForProduct.id} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExistingProducts}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Greeting Dialog */}
      <Dialog open={greetingDialogOpen} onClose={handleCloseGreetingDialog} fullWidth maxWidth='sm'>
        <DialogTitle>Greeting Message</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label='Greeting Message'
            value={greetingData.greetingMessage}
            onChange={e => setGreetingData({ ...greetingData, greetingMessage: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={greetingData.greetingActive}
                onChange={e => setGreetingData({ ...greetingData, greetingActive: e.target.checked })}
              />
            }
            label='Enable Greeting Message'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGreetingDialog} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleGreetingUpdate} color='primary'>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar لعرض الرسائل التنبيهية */}
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
