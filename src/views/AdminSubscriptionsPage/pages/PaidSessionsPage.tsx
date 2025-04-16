// src/pages/PaidSessionsPage.tsx
// import React, { useEffect, useState } from 'react';
// import { Box, Typography, CircularProgress, TextField, Button } from '@mui/material';
// import { DataGrid, GridColDef } from '@mui/x-data-grid';
// import axios from 'src/utils/axios';
// import dayjs from 'dayjs';

// export interface Session {
//   id: number;
//   sessionIdentifier: string;
//   userId: number;
//   status: string;
//   expireDate: string | null;
//   phoneNumber: string | null;
//   clientName: string | null;
//   planType?: string;
// }

// const PaidSessionsPage: React.FC = () => {
//   const [sessions, setSessions] = useState<Session[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [phoneFilter, setPhoneFilter] = useState<string>('');

//   const fetchSessions = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get('/api/sessions');
//       Filter sessions that have status 'Paid'
//       const paidSessions = res.data.filter((session: Session) => session.status === 'Paid');
//       setSessions(paidSessions);
//     } catch (error) {
//       console.error(error);
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchSessions();
//   }, []);

//   Apply phone number filter
//   const filteredSessions = sessions.filter((session) => {
//     return phoneFilter ? session.phoneNumber?.includes(phoneFilter) : true;
//   });

//   const columns: GridColDef<Session>[] = [
//     { field: 'id', headerName: 'ID', width: 70 },
//     { field: 'clientName', headerName: 'Client', flex: 1 },
//     { field: 'phoneNumber', headerName: 'Phone Number', flex: 1 },
//     { field: 'planType', headerName: 'Plan Type', flex: 1 },
//     {
//       field: 'expireDate',
//       headerName: 'Expiry Date',
//       flex: 1,
//       valueFormatter: (params: { value: string }) =>
//         params.value ? new Date(params.value).toLocaleDateString() : ''
//     },
//     { field: 'status', headerName: 'Status', flex: 1 }
//   ];

//   return (
//     <Box p={3}>
//       <Typography variant="h4" gutterBottom>
//         Paid Sessions Overview
//       </Typography>
//       <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
//         <TextField 
//           label="Filter by Phone Number" 
//           value={phoneFilter}
//           onChange={(e) => setPhoneFilter(e.target.value)}
//         />
//         <Button variant="contained" onClick={fetchSessions}>
//           Refresh
//         </Button>
//       </Box>
//       {loading ? (
//         <CircularProgress />
//       ) : (
//         <div style={{ height: 500, width: '100%' }}>
//           <DataGrid 
//             rows={filteredSessions}
//             columns={columns}
//             getRowId={(row) => row.id}
//             pageSizeOptions={[10, 20, 50]}
//             paginationModel={{ pageSize: 10, page: 0 }}
//             disableRowSelectionOnClick
//           />
//         </div>
//       )}
//     </Box>
//   );
// };

// export default PaidSessionsPage;
