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
  Checkbox
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

  // حالة الحقول لإنشاء جلسة جديدة
  const [sessionData, setSessionData] = useState({
    status: '',
    category: '',
    products: '',
    keywords: ''
  })

  // حالات لعرض الـ QR Code
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(null)

  // حالات Popups لإضافة بيانات
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false)
  const [productPopupOpen, setProductPopupOpen] = useState(false)
  const [keywordPopupOpen, setKeywordPopupOpen] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)

  // حالات عرض القوائم الحالية
  const [showExistingCategories, setShowExistingCategories] = useState(false)
  const [showExistingProducts, setShowExistingProducts] = useState(false)
  const [selectedSessionForCategory, setSelectedSessionForCategory] = useState<SessionType | null>(null)
  const [selectedSessionForProduct, setSelectedSessionForProduct] = useState<SessionType | null>(null)

  // لائحة الفئات المتاحة عند إضافة منتج
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([])

  // =============== [ بداية الإضافات الخاصة بالـ Greeting ] ===============
  const [greetingDialogOpen, setGreetingDialogOpen] = useState(false)
  const [selectedSessionGreeting, setSelectedSessionGreeting] = useState<SessionType | null>(null)
  const [greetingData, setGreetingData] = useState({
    greetingMessage: '',
    greetingActive: false
  })

  // فتح نافذة الحوار الخاصة بالـ Greeting
  const openGreetingPopup = (session: SessionType) => {
    setSelectedSessionGreeting(session)
    setGreetingData({
      greetingMessage: session.greetingMessage || '',
      greetingActive: Boolean(session.greetingActive)
    })
    setGreetingDialogOpen(true)
  }

  // غلق الديالوج
  const handleCloseGreetingDialog = () => {
    setGreetingDialogOpen(false)
    setSelectedSessionGreeting(null)
  }

  // حفظ التعديلات على رسالة الترحيب
  const handleGreetingUpdate = async () => {
    if (!selectedSessionGreeting) return
    try {
      await axiosServices.put(`/api/sessions/${selectedSessionGreeting.id}/greeting`, {
        greetingMessage: greetingData.greetingMessage,
        greetingActive: greetingData.greetingActive
      })

      // تحديث البيانات في الـ store
      dispatch(
        updateSession({
          sessionId: selectedSessionGreeting.id,
          changes: {
            greetingMessage: greetingData.greetingMessage,
            greetingActive: greetingData.greetingActive
          }
        })
      )

      alert('Greeting message updated successfully.')
      setGreetingDialogOpen(false)
    } catch (error) {
      console.error('Error updating greeting:', error)
      alert('An error occurred while updating the greeting message.')
    }
  }
  // =============== [ نهاية الإضافات الخاصة بالـ Greeting ] ===============

  // Socket.io للاستماع لتحديثات الـ session
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

  // جلب الجلسات
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // إنشاء جلسة جديدة
  const handleCreateSession = async () => {
    if (maxSessionsReached) {
      alert('Maximum sessions limit reached.')
      return
    }
    try {
      await dispatch(createSession(sessionData))
      setSessionData({ status: '', category: '', products: '', keywords: '' })
      dispatch(fetchSessions()) // تحديث الجلسات بعد الإنشاء
    } catch (error) {
      alert('Failed to create session.')
    }
  }

  // إظهار الـ QR Code
  const handleShowQr = async (session: SessionType) => {
    try {
      const response = await axiosServices.get(`/api/sessions/${session.id}/qr`)
      const qrData = response.data.qr
      setSelectedSession({ ...session, qrCode: qrData })
      setQrDialogOpen(true)
    } catch (error) {
      console.error('Error fetching QR code:', error)
      alert('Failed to fetch QR code.')
    }
  }

  // إغلاق حوار الـ QR
  const handleCloseQrDialog = () => {
    setQrDialogOpen(false)
    setSelectedSession(null)
  }

  // مجرد مثال لتغيير الحالة أمام المستخدم (غير متصل بالخلفية حالياً)
  const toggleStatus = (session: SessionType) => {
    const updatedStatus = session.status === 'Active' ? 'Inactive' : 'Active'
    session.status = updatedStatus
    // للتحديث الحقيقي، يجب استدعاء API لتحديث الحالة ثم جلب البيانات من جديد.
  }

  // حذف جلسة
  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm(`Are you sure you want to delete the session with ID: ${sessionId}?`)) {
      return
    }
    try {
      await axiosServices.delete(`/api/sessions/${sessionId}`)
      alert('Session deleted successfully.')
      dispatch(fetchSessions()) // تحديث القائمة بعد الحذف
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('An error occurred while deleting the session.')
    }
  }

  // فتح Popups وتعيين الـ sessionId النشط
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

  // ==================== [ زرار الـ Bot ON / OFF ] ====================
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

      alert(`Bot is now ${newBotActive ? 'ON' : 'OFF'} for session ${session.id}`)
    } catch (error) {
      console.error('Error toggling bot:', error)
      alert('An error occurred while toggling the bot.')
    }
  }
  // ===============================================================

  // دوال تقديم البيانات للـ API
  const submitCategory = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/category`, data)
      alert('Category added successfully.')
    } catch (error) {
      alert('Error adding category.')
    }
  }

  const submitProduct = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/product`, data)
      alert('Product added successfully.')
    } catch (error) {
      alert('Error adding product.')
    }
  }

  const submitKeyword = async (data: any) => {
    if (!activeSessionId) return
    try {
      await axiosServices.post(`/api/sessions/${activeSessionId}/keyword`, data)
      alert('Keyword added successfully.')
    } catch (error) {
      alert('Error adding keyword.')
    }
  }

  // دوال فتح وإغلاق نوافذ عرض البيانات الحالية
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
              {/* عرض عمود Phone Number الجديد */}
              <TableCell>Phone Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align='right'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map(session => (
              <TableRow key={session.id}>
                <TableCell>{session.id}</TableCell>
                {/* هنا نعرض قيمة phoneNumber من الـ session */}
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
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => toggleStatus(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    {session.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
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

                  {/* زر خاص برسالة الترحيب */}
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={() => openGreetingPopup(session)}
                    sx={{ mr: 1, mb: 1 }}
                  >
                    Greeting
                  </Button>

                  {/* زر الـ Bot On/Off */}
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

      {/* أزرار لعرض الفئات والمنتجات الحالية */}
      <Button onClick={openExistingCategories} sx={{ mt: 2, mr: 2 }} variant='outlined'>
        Existing Categories
      </Button>
      <Button onClick={openExistingProducts} sx={{ mt: 2 }} variant='outlined'>
        Existing Products
      </Button>

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

      {/* Popups لإضافة بيانات */}
      <AddDataPopup
        open={categoryPopupOpen}
        onClose={() => setCategoryPopupOpen(false)}
        onSubmit={submitCategory}
        title='Add Category'
        fields={[{ label: 'Category Name', name: 'category_name' }]}
      />
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

      {/* Dialog لعرض الفئات الحالية مع اختيار الجلسة */}
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

      {/* Dialog لعرض المنتجات الحالية مع اختيار الجلسة */}
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

      {/* ====================== [ Dialog لرسالة الترحيب ] ====================== */}
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
    </Box>
  )
}

export default SessionListing
