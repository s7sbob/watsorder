import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import axios from 'src/utils/axios';

export interface Session {
  id: number;
  sessionIdentifier: string;
  userId: number;
  status: string;
  expireDate: string | null;
  phoneNumber: string | null;
  clientName: string | null;
}

const ActiveSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter states
  const [phoneFilter, setPhoneFilter] = useState<string>('');
  const [fromExpireDate, setFromExpireDate] = useState<Date | null>(null);
  const [toExpireDate, setToExpireDate] = useState<Date | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sessions');
      // Filter sessions with expireDate and that are not terminated/expired
      const allSessions: Session[] = res.data;
      const activeSessions = allSessions.filter(s => {
        if (!s.expireDate) return false;
        if (s.status === 'Terminated' || s.status === 'Expired') return false;
        return true;
      });
      setSessions(activeSessions);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Apply filters to sessions
  const filteredSessions = sessions.filter(s => {
    const phoneMatch = phoneFilter ? s.phoneNumber?.includes(phoneFilter) : true;
    let dateMatch = true;
    if (fromExpireDate && s.expireDate) {
      dateMatch = dateMatch && new Date(s.expireDate) >= fromExpireDate;
    }
    if (toExpireDate && s.expireDate) {
      dateMatch = dateMatch && new Date(s.expireDate) <= toExpireDate;
    }
    return phoneMatch && dateMatch;
  });

  const columns: GridColDef<Session>[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'clientName', headerName: 'Client', flex: 1 },
    { field: 'phoneNumber', headerName: 'Phone Number', flex: 1 },
    {
      field: 'expireDate',
      headerName: 'Expiry Date',
      flex: 1,
      valueFormatter: (params: { value: string }) =>
        params.value ? new Date(params.value).toLocaleString() : ''
    },
    { field: 'status', headerName: 'Status', flex: 1 }
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Active Sessions with Expiry Date
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <TextField 
          label="Search by Phone Number"
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
        />
        <DatePicker
          label="From Expiry Date"
          value={fromExpireDate ? dayjs(fromExpireDate) : null}
          onChange={(newValue) => setFromExpireDate(newValue ? newValue.toDate() : null)}
          renderInput={(params) => <TextField {...params} />}
        />
        <DatePicker
          label="To Expiry Date"
          value={toExpireDate ? dayjs(toExpireDate) : null}
          onChange={(newValue) => setToExpireDate(newValue ? newValue.toDate() : null)}
          renderInput={(params) => <TextField {...params} />}
        />
        <Button variant="contained" color="primary" onClick={fetchSessions}>
          Refresh
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <div style={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={filteredSessions}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 20, 50]}
            paginationModel={{ pageSize: 10, page: 0 }}
            disableRowSelectionOnClick
          />
        </div>
      )}
    </Box>
  );
};

export default ActiveSessionsPage;
