// src/components/SessionListing.tsx

import { useEffect, useState, MouseEvent } from 'react'
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
  Menu,
  TextField
} from '@mui/material'
import * as XLSX from 'xlsx'
import DeleteIcon from '@mui/icons-material/Delete'
import { fetchSessions, createSession, updateSession } from 'src/store/apps/sessions/SessionSlice'
import { SessionType } from 'src/types/apps/session'
import { useDispatch, useSelector } from 'src/store/Store'
import AddDataPopup from './AddDataPopup'
import axiosServices from 'src/utils/axios'
import CategoryList from './CategoryList'
import ProductList from './ProductList'
import KeywordList from './KeywordList' // ملف عرض الـ Keywords (نستعين به)

import socket from 'src/socket'
import { useNavigate } from 'react-router'

const SessionListing = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const sessions = useSelector(state => state.sessionReducer.sessions) as SessionType[]
  const maxSessionsReached = useSelector(state => state.sessionReducer.maxSessionsReached) as boolean

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

  // =============== [ Show existing categories/products/keywords ] ===============
  const [showExistingCategories, setShowExistingCategories] = useState(false)
  const [showExistingProducts, setShowExistingProducts] = useState(false)
  const [showExistingKeywords, setShowExistingKeywords] = useState(false)

  // تصنيفات متاحة للـ Product form
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([])

  // =============== [ Broadcast Dialog مرتبط بكل جلسة ] ===============
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)
  const [broadcastSessionId, setBroadcastSessionId] = useState<number | null>(null)

  interface MediaFile {
    base64: string
    mimetype: string
    filename: string
  }

  const [broadcastData, setBroadcastData] = useState<{
    phoneNumbers: string[]
    message: string
    randomNumbers: number[]
    media: MediaFile[]
  }>({
    phoneNumbers: [],
    message: '',
    randomNumbers: [],
    media: []
  })

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

  // =============== [ Keywords Popup + Submission ] ===============
  // في هذا المثال: سنجعل AddDataPopup يستقبل 3 حقول:
  // 1) keyword
  // 2) replyText
  // 3) replyMedia (isFile)
  const submitKeywordWithMedia = async (formData: any) => {
    if (!activeSessionId) return

    const { keyword, replyText, replyMedia } = formData

    if (!keyword || !replyText) {
      showAlert('Please fill the keyword and replyText fields.', 'warning')
      return
    }

    // لاحظ أننا في AddDataPopup نخزّن الحقل الملف كشيء فيه {base64, mimetype, filename}
    // قد يكون replyMedia = undefined لو لم يرفع المستخدم أي ملف
    let replyMediaBase64 = null
    let replyMediaMimeType = null
    let replyMediaFilename = null

    if (replyMedia) {
      replyMediaBase64 = replyMedia.base64 || null
      replyMediaMimeType = replyMedia.mimetype || null
      replyMediaFilename = replyMedia.filename || null
    }

    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/keyword`, {
        keyword,
        replyText,
        replyMediaBase64,
        replyMediaMimeType,
        replyMediaFilename
      })
      showAlert('Keyword added successfully.', 'success')
    } catch (error) {
      showAlert('Error adding keyword.', 'error')
    }
  }

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

  // =============== [ Toggle Menu Bot on/off ] ===============
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

  // =============== [ Broadcast Handling لكل جلسة ] ===============
  const openBroadcastDialog = (sessionId: number) => {
    setBroadcastSessionId(sessionId)
    // إعادة التهيئة
    setBroadcastData({
      phoneNumbers: [],
      message: '',
      randomNumbers: [],
      media: []
    })
    setBroadcastDialogOpen(true)
  }

  const handleCloseBroadcastDialog = () => {
    setBroadcastDialogOpen(false)
    // إعادة تهيئة
    setBroadcastData({
      phoneNumbers: [],
      message: '',
      randomNumbers: [],
      media: []
    })
    setBroadcastSessionId(null)
  }

  const handleExcelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = e => {
      const data = e.target?.result
      if (!data) return

      // قراءة الملف بواسطة XLSX
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })
      const phoneNumbersFromExcel = rows
        .map(row => row[0])
        .filter(Boolean)

      setBroadcastData(prev => ({
        ...prev,
        phoneNumbers: phoneNumbersFromExcel as string[]
      }))
    }

    reader.readAsBinaryString(file)
  }

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (value.includes('-')) {
      const [startStr, endStr] = value.split('-').map(part => part.trim())
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const numbers: number[] = []
        for (let i = start; i <= end; i++) {
          numbers.push(i)
        }
        setBroadcastData(prev => ({ ...prev, randomNumbers: numbers }))
      } else {
        setBroadcastData(prev => ({ ...prev, randomNumbers: [] }))
      }
    } else {
      const numbers = value
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(num => !isNaN(num))
      setBroadcastData(prev => ({ ...prev, randomNumbers: numbers }))
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    const files = Array.from(event.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        if (e.target?.result) {
          const base64String = e.target.result.toString()
          const base64Only = base64String.split(',')[1]
          setBroadcastData(prev => ({
            ...prev,
            media: [
              ...prev.media,
              {
                base64: base64Only,
                mimetype: file.type,
                filename: file.name
              }
            ]
          }))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleInsertPlaceholder = (placeholder: string) => {
    setBroadcastData(prev => ({
      ...prev,
      message: `${prev.message} ${placeholder}`
    }))
  }

  const getCurrentDateTime = () => {
    const now = new Date()
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
  }

  const handleBroadcastSubmit = async () => {
    if (!broadcastSessionId) {
      showAlert('No session selected for broadcast.', 'error')
      return
    }
    const { phoneNumbers, message, randomNumbers, media } = broadcastData
    if (!phoneNumbers.length || !randomNumbers.length) {
      showAlert('Please fill all required fields', 'error')
      return
    }

    try {
      // فقط مثال بسيط: استبدال ${recipientPhone} و${currentDateTime} للجميع
      // لو أردت إرسال رسالة مختلفة لكل رقم، تحتاج منطق مختلف
      const finalMessage = phoneNumbers.map(phoneNumber =>
        message
          .replace('${recipientPhone}', phoneNumber)
          .replace('${currentDateTime}', getCurrentDateTime())
      )
      await axiosServices.post(`/api/sessions/${broadcastSessionId}/broadcast`, {
        phoneNumbers,
        message: finalMessage.join(' '), // دمجهم في رسالة واحدة؛ لو أردت رسالة لكل رقم على حدة، غيّر المنطق
        randomNumbers,
        media
      })

      showAlert('Broadcast messages sent successfully', 'success')
      handleCloseBroadcastDialog()
    } catch (error) {
      console.error('Error sending broadcast:', error)
      showAlert('Failed to send broadcast messages', 'error')
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

  return (
    <Box mt={4}>
      {/* ------------- Create Session Form ------------- */}
      <Button variant='contained' color='primary' onClick={handleCreateSession} sx={{ mt: 2 }}>
        Create Session
      </Button>

      
      <Button
        variant='contained'
        color='primary'
        sx={{ mt: 2 }}
        onClick={() => navigate('/api-docs')}
      >
        Open API Documentation
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
                  {/* Waiting for QR? => Show QR */}
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

                  {/* Not terminated => Logout */}
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

                  {/* Terminated => Login */}
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

                  {/* Category's Menu */}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={(e) => handleOpenCategoryMenu(e, session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Category's
                  </Button>
                  <Menu
                    anchorEl={anchorElCategory}
                    open={Boolean(anchorElCategory) && activeSessionId === session.id}
                    onClose={handleCloseCategoryMenu}
                  >
                    <MenuItem onClick={handleAddCategoryMenu}>Add Category</MenuItem>
                    <MenuItem onClick={handleExistingCategoryMenu}>Existing Category's</MenuItem>
                  </Menu>

                  {/* Products Menu */}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={(e) => handleOpenProductMenu(e, session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Products
                  </Button>
                  <Menu
                    anchorEl={anchorElProduct}
                    open={Boolean(anchorElProduct) && activeSessionId === session.id}
                    onClose={handleCloseProductMenu}
                  >
                    <MenuItem onClick={handleAddProductMenu}>Add Product</MenuItem>
                    <MenuItem onClick={handleExistingProductMenu}>Existing Products</MenuItem>
                  </Menu>

                  {/* Keywords Menu: Add or Existing */}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => {
                      setActiveSessionId(session.id)
                      setKeywordPopupOpen(true) // لفتح AddDataPopup
                    }}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Add Keyword
                  </Button>

                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => {
                      setActiveSessionId(session.id)
                      setShowExistingKeywords(true)
                    }}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Existing Keywords
                  </Button>

                  {/* Broadcast Button */}
                  <Button
                    variant='outlined'
                    size='small'
                    color='secondary'
                    onClick={() => openBroadcastDialog(session.id)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Broadcast
                  </Button>

                  {/* Greeting */}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openGreetingPopup(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Greeting
                  </Button>

                  {/* Bot ON/OFF */}
                  <Button
                    variant='contained'
                    color={session.botActive ? 'success' : 'warning'}
                    size='small'
                    onClick={() => handleToggleBot(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {session.botActive ? 'Bot OFF' : 'Bot ON'}
                  </Button>

                  {/* Menu Bot ON/OFF */}
                  <Button
                    variant='contained'
                    color={session.menuBotActive ? 'success' : 'warning'}
                    size='small'
                    onClick={() => handleToggleMenuBot(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {session.menuBotActive ? 'Menu Bot OFF' : 'Menu Bot ON'}
                  </Button>

                  {/* Delete Session */}
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

      {/* ------------- QR Code Dialog ------------- */}
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

      {/* ------------- Broadcast Dialog ------------- */}
      <Dialog open={broadcastDialogOpen} onClose={handleCloseBroadcastDialog} fullWidth maxWidth='sm'>
        <DialogTitle>Broadcast Message</DialogTitle>
        <DialogContent>
          <TextField
            label='Phone Numbers (comma separated)'
            fullWidth
            margin='normal'
            value={broadcastData.phoneNumbers.join(',')}
            onChange={e =>
              setBroadcastData({ ...broadcastData, phoneNumbers: e.target.value.split(',') })
            }
          />

          <Button variant='contained' component='label' sx={{ mt: 2 }}>
            Upload Excel
            <input type='file' hidden onChange={handleExcelChange} accept='.xlsx, .xls' />
          </Button>

          {broadcastData.phoneNumbers.length > 0 && (
            <ul>
              {broadcastData.phoneNumbers.map((phone, idx) => (
                <li key={idx}>{phone}</li>
              ))}
            </ul>
          )}

          <TextField
            label='Message'
            fullWidth
            margin='normal'
            multiline
            rows={4}
            value={broadcastData.message}
            onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })}
          />
          <Button
            variant='outlined'
            onClick={() => handleInsertPlaceholder('${recipientPhone}')}
            sx={{ mt: 2, mr: 1 }}
          >
            Insert Recipient Phone
          </Button>
          <Button
            variant='outlined'
            onClick={() => handleInsertPlaceholder('${currentDateTime}')}
            sx={{ mt: 2 }}
          >
            Insert Date/Time
          </Button>

          <TextField
            label='Delays (comma separated or interval e.g. 5-7)'
            fullWidth
            margin='normal'
            onChange={handleDelayChange}
          />

          <Button variant='contained' component='label' sx={{ mt: 2 }}>
            Upload Image(s)
            <input type='file' multiple hidden accept='image/*' onChange={handleImageChange} />
          </Button>

          {broadcastData.media.length > 0 && (
            <ul>
              {broadcastData.media.map((file, idx) => (
                <li key={idx}>{file.filename}</li>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBroadcastDialog} color='secondary'>
            Cancel
          </Button>
          <Button onClick={handleBroadcastSubmit} color='primary'>
            Send Broadcast
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------- Add Category Popup ------------- */}
      <AddDataPopup
        open={categoryPopupOpen}
        onClose={() => setCategoryPopupOpen(false)}
        onSubmit={submitCategory}
        title='Add Category'
        fields={[
          { label: 'Category Name', name: 'category_name' }
        ]}
      />

      {/* ------------- Add Product Popup ------------- */}
      <AddDataPopup
        open={productPopupOpen}
        onClose={() => setProductPopupOpen(false)}
        onSubmit={submitProduct}
        title='Add Product'
        fields={[
          { label: 'Product Name', name: 'product_name' },
          { label: 'Category', name: 'category_id', options: productCategories },
          { label: 'Price', name: 'price' }
        ]}
      />

      {/* ------------- Add Keyword Popup (يستخدم AddDataPopup) ------------- */}
      <AddDataPopup
        open={keywordPopupOpen}
        onClose={() => setKeywordPopupOpen(false)}
        onSubmit={submitKeywordWithMedia}
        title='Add Keyword or  Multiple Keywords'
        fields={[
          { label: 'Keywords', name: 'keywords', isMultipleKeywords: true },
          { label: 'Reply Text', name: 'replyText' },
          { label: 'Reply Media', name: 'replyMedia', isFile: true }
        ]}
      />

      {/* ------------- Existing Categories Dialog ------------- */}
      <Dialog
        open={showExistingCategories}
        onClose={() => setShowExistingCategories(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Existing Category's</DialogTitle>
        <DialogContent>
          {activeSessionId ? (
            <CategoryList sessionId={activeSessionId} />
          ) : (
            <div>No session selected</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExistingCategories(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ------------- Existing Products Dialog ------------- */}
      <Dialog
        open={showExistingProducts}
        onClose={() => setShowExistingProducts(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Existing Products</DialogTitle>
        <DialogContent>
          {activeSessionId ? (
            <ProductList sessionId={activeSessionId} />
          ) : (
            <div>No session selected</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExistingProducts(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ------------- Existing Keywords Dialog ------------- */}
      <Dialog
        open={showExistingKeywords}
        onClose={() => setShowExistingKeywords(false)}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle>Existing Keywords</DialogTitle>
        <DialogContent>
          {activeSessionId ? (
            <KeywordList sessionId={activeSessionId} />
          ) : (
            <div>No session selected</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExistingKeywords(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ------------- Greeting Dialog ------------- */}
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

      {/* ------------- Snackbar ------------- */}
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
