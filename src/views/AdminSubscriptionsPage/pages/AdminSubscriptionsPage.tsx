// src/views/pages/AdminSubscriptionsPage.tsx (أو أينما)

import React, { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, IconButton, Button } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { Delete as DeleteIcon, Refresh as RefreshIcon, FileDownload as FileDownloadIcon, Add as AddIcon } from '@mui/icons-material'
import axios from 'src/utils/axios'
import RenewSubscriptionDialog from './RenewSubscriptionDialog' // سننشئه
import dayjs from 'dayjs'

interface SubscriptionRenewal {
  id: number
  sessionId: number
  phoneNumber: string
  planType: string
  renewalPeriod: string | null
  amountPaid: number | null
  newExpireDate: string | null
  renewalDate: string | null
  status: string | null
  sessionStatus?: string | null
}

const AdminSubscriptionsPage: React.FC = () => {
  const [renewals, setRenewals] = useState<SubscriptionRenewal[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // حوار التجديد
  const [renewDialogOpen, setRenewDialogOpen] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)

  const fetchRenewals = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/subscriptions') 
      setRenewals(res.data)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRenewals()
  }, [])

  // حذف سجل من history
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this renewal record?')) return
    try {
      await axios.delete(`/api/subscriptions/${id}`)
      fetchRenewals()
    } catch (error) {
      console.error(error)
      alert('Failed to delete renewal record.')
    }
  }

  // زر فتح حوار التجديد, نحتاج sessionId
  // (هنا نحتاج أن تعرف من أي جلسة سنجدد)
  // قد تعرِض عمود sessionId + زر "Renew" بجانب كل row للـ session 
  // أو Tmaybe we add a separate sessions page

  const columns: GridColDef<SubscriptionRenewal>[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'sessionId', headerName: 'Session ID', width: 80 },
    { field: 'phoneNumber', headerName: 'Phone Number', flex: 1 },
    { field: 'planType', headerName: 'Plan', flex: 1 },
    {
      field: 'renewalPeriod',
      headerName: 'Period',
      width: 100
    },
    {
      field: 'amountPaid',
      headerName: 'Amount',
      width: 100,
      renderCell: (params) => {
        if (!params.value) return ''
        return `${params.value} EGP`
      }
    },
    {
      field: 'renewalDate',
      headerName: 'Renewal Date',
      width: 160,
      renderCell: (params) => {
        if (!params.value) return ''
        return dayjs(params.value as string).format('YYYY-MM-DD HH:mm')
      }
    },
    {
      field: 'newExpireDate',
      headerName: 'Expire After Renew',
      width: 160,
      renderCell: (params) => {
        if (!params.value) return ''
        return dayjs(params.value as string).format('YYYY-MM-DD')
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120
    },
    {
      field: 'sessionStatus',
      headerName: 'Session Status',
      width: 120
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const row = params.row
        return (
          <>
            <IconButton
              onClick={() => handleDelete(row.id)}
              color='error'
              title='Delete This Record'
            >
              <DeleteIcon />
            </IconButton>
          </>
        )
      }
    }
  ]

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/subscriptions/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'subscription-renewals.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      alert('Failed to export CSV.')
    }
  }

  // زر Opens a Renew dialog
  const handleOpenRenewDialog = (sessionId: number) => {
    setSelectedSessionId(sessionId)
    setRenewDialogOpen(true)
  }
  const handleCloseRenewDialog = () => {
    setRenewDialogOpen(false)
    setSelectedSessionId(null)
  }
  const handleRenewSuccess = () => {
    setRenewDialogOpen(false)
    setSelectedSessionId(null)
    fetchRenewals()
  }

  return (
    <Box p={3}>
      <Typography variant='h4' gutterBottom>
        Subscription Renewal Management (History)
      </Typography>

      <Box display='flex' gap={2} mb={2}>
        <Button
          variant='contained'
          color='primary'
          startIcon={<RefreshIcon />}
          onClick={fetchRenewals}
        >
          Refresh
        </Button>
        <Button
          variant='contained'
          color='secondary'
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
        >
          Export CSV
        </Button>

        {/* لو تريد زر Renew عام, تحتاج sessionId. قد يكون منطقي عمل renew من صفحة Sessions */}
        {/* لكن مثالاً, نضع زر جلب sessionId من user prompt */}
        <Button
          variant='contained'
          color='success'
          startIcon={<AddIcon />}
          onClick={() => {
            const sidStr = window.prompt('Enter Session ID to Renew:')
            if (sidStr) {
              const sid = parseInt(sidStr, 10)
              if (sid) {
                handleOpenRenewDialog(sid)
              }
            }
          }}
        >
          Renew Session
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <div style={{ height: 550, width: '100%' }}>
          <DataGrid<SubscriptionRenewal>
            rows={renewals}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10,20,50]}
            paginationModel={{ pageSize: 10, page:0 }}
            onPaginationModelChange={() =>{}}
          />
        </div>
      )}

      {/* حوار لعمل Renew */}
      {selectedSessionId && (
        <RenewSubscriptionDialog
          open={renewDialogOpen}
          onClose={handleCloseRenewDialog}
          sessionId={selectedSessionId}
          onSuccess={handleRenewSuccess}
        />
      )}
    </Box>
  )
}

export default AdminSubscriptionsPage
