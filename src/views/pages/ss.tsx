
// src/components/SessionListing.tsx

import { useEffect, useState, MouseEvent } from 'react'
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
  AlertColor,
  Menu
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

  // =============== [ State for creating new session ] ===============
  const [sessionData, setSessionData] = useState({
    status: '',
    greetingMessage: '',
    greetingActive: false
  })

  // =============== [ QR Code Dialog ] ===============
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)

  // =============== [ Popups for adding data ] ===============
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false)
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [keywordPopupOpen, setKeywordPopupOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  // =============== [ Show existing categories/products ] ===============
  const [showExistingCategories, setShowExistingCategories] = useState(false)
  const [showExistingProducts, setShowExistingProducts] = useState(false)



  // تصنيفات متاحة للـ Product form
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([])

  // =============== [ Greeting Dialog ] ===============
  const [greetingDialogOpen, setGreetingDialogOpen] = useState(false)
  const [selectedSessionGreeting, setSelectedSessionGreeting] = useState<SessionType | null>(null)
  const [greetingData, setGreetingData] = useState({
    greetingMessage: '',
    greetingActive: false
  })

  // =============== [ Snackbar for Alerts ] ===============
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

  // =============== [ Menu Bot Toggle - Placeholder ] ===============
  const handleToggleMenuBot = async (session: SessionType) => {
    const newMenuBotActive = !session.menuBotActive
    try {
      await axiosServices.put(`/api/sessions/${session.id}/menu-bot`, {
        menuBotActive: newMenuBotActive
      })
  
      dispatch(
        updateSession({
          sessionId: session.id,
          changes: { menuBotActive: newMenuBotActive }
        })
      )
  
      showAlert(`Menu Bot is now ${newMenuBotActive ? 'ON' : 'OFF'} for session ${session.id}`, 'info')
  
    } catch (error) {
      console.error('Error toggling menu bot:', error)
      showAlert('An error occurred while toggling the Menu Bot.', 'error')
    }
  }



  // =============== [ Greeting Handling ] ===============
  const openGreetingPopup = (session: SessionType) => {
    setSelectedSessionGreeting(session)
    setGreetingData({
      greetingMessage: session.greetingMessage || '',
      greetingActive: Boolean(session.greetingActive)
    })
    setGreetingDialogOpen(true)
  }
  const handleCloseGreetingDialog = () => {
    setGreetingDialogOpen(false)
    setSelectedSessionGreeting(null)
  }
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

  // =============== [ Socket.io to listen for session updates ] ===============
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

  // =============== [ fetch Sessions on mount ] ===============
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // =============== [ Create Session ] ===============
  const handleCreateSession = async () => {
    if (maxSessionsReached) {
      showAlert('Maximum sessions limit reached.', 'warning')
      return
    }
    try {
      await dispatch(createSession(sessionData))
      setSessionData({ status: '', greetingMessage: '', greetingActive: false })
      dispatch(fetchSessions())
      showAlert('Session created successfully.', 'success')
    } catch (error) {
      showAlert('Failed to create session.', 'error')
    }
  }

  // =============== [ Show / Close QR Code ] ===============
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

  // =============== [ Logout / Login / Delete Session ] ===============
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

  // =============== [ Category's Menu Handling ] ===============
  const [anchorElCategory, setAnchorElCategory] = useState<null | HTMLElement>(null)
  const handleOpenCategoryMenu = (event: MouseEvent<HTMLElement>, sessionId: number) => {
    setActiveSessionId(sessionId)
    setAnchorElCategory(event.currentTarget)
  }
  const handleCloseCategoryMenu = () => {
    setAnchorElCategory(null)
  }
  const handleAddCategoryMenu = () => {
    setAnchorElCategory(null)
    setCategoryPopupOpen(true)
  }
  const handleExistingCategoryMenu = () => {
    setAnchorElCategory(null)
    setShowExistingCategories(true)
  }

  // =============== [ Products Menu Handling ] ===============
  const [anchorElProduct, setAnchorElProduct] = useState<null | HTMLElement>(null)
  const handleOpenProductMenu = (event: MouseEvent<HTMLElement>, sessionId: number) => {
    setActiveSessionId(sessionId)
    setAnchorElProduct(event.currentTarget)
  }
  const handleCloseProductMenu = () => {
    setAnchorElProduct(null)
  }
  const handleAddProductMenu = async () => {
    setAnchorElProduct(null)
    if (!activeSessionId) return
    try {
      const response = await axiosServices.get(`/api/sessions/${activeSessionId}/categories`)
      const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }))
      setProductCategories(cats)
    } catch (error) {
      console.error(error)
    }
    setProductPopupOpen(true)
  }
  const handleExistingProductMenu = () => {
    setAnchorElProduct(null)
    setShowExistingProducts(true)
  }

  // =============== [ Submit Category / Product ] ===============
  const submitCategory = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/category`, data)
      showAlert('Category added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding category.', 'error')
    }
  }

  const submitProduct = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/product`, data)
      showAlert('Product added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding product.', 'error')
    }
  }

  // =============== [ Keywords with multiple input (Autocomplete) ] ===============
  const submitKeyword = async (data: any) => {
    if (!activeSessionId) return
    const { keywords, replyText } = data

    if (!Array.isArray(keywords) || keywords.length === 0) {
      showAlert('Please enter at least one keyword.', 'warning')
      return
    }
    if (!replyText) {
      showAlert('Please enter a reply text.', 'warning')
      return
    }

    try {
      for (const kw of keywords) {
        await axiosServices.post(`/api/sessions/${activeSessionId}/keyword`, {
          keyword: kw,
          replyText
        })
      }
      showAlert('All keywords have been added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding keywords.', 'error')
    }
  }

  // =============== [ Close Existing Category / Products ] ===============
  const closeExistingCategories = () => setShowExistingCategories(false)
  const closeExistingProducts = () => setShowExistingProducts(false)

  // =============== [ Toggle Bot on/off ] ===============
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

  return (
    <Box mt={4}>
      {/* ------------- Create Session Form ------------- */}
      <TextField
        label='Status'
        value={sessionData.status}
        onChange={e => setSessionData({ ...sessionData, status: e.target.value })}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label='Greeting Message'
        value={sessionData.greetingMessage}
        onChange={e => setSessionData({ ...sessionData, greetingMessage: e.target.value })}
        fullWidth
        sx={{ mb: 2 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={sessionData.greetingActive}
            onChange={e => setSessionData({ ...sessionData, greetingActive: e.target.checked })}
          />
        }
        label='Enable Greeting Message'
      />
      <Button variant='contained' color='primary' onClick={handleCreateSession} sx={{ mt: 2 }}>
        Create Session
      </Button>



      {/* ------------- Sessions Table ------------- */}
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
                  {/* ... (بقية الأزرار والإجراءات الأخرى) ... */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>


      {/* ... (بقية المكونات الأخرى مثل QR Dialog و AddDataPopup) ... */}

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