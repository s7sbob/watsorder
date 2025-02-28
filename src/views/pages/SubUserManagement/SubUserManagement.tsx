// src/views/pages/SubUserManagement.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, MenuItem } from '@mui/material';
import axiosServices from 'src/utils/axios';

interface SubUser {
  id: number;
  username: string;
  name: string;
  subUserRole: string; // "menu" أو "full"
}

const SubUserManagement: React.FC = () => {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [subUserRole, setSubUserRole] = useState('menu'); // القيمة الافتراضية "menu"
  const [message, setMessage] = useState('');

  const fetchSubUsers = async () => {
    try {
      const response = await axiosServices.get('/api/sub-users'); // نفترض endpoint getSubUsers
      setSubUsers(response.data);
    } catch (error) {
      console.error('Error fetching sub-users:', error);
    }
  };

  useEffect(() => {
    fetchSubUsers();
  }, []);

  const handleCreateSubUser = async () => {
    if (!username || !name || !password || !subUserRole) {
      setMessage('Please fill in all fields.');
      return;
    }
    try {
      await axiosServices.post('/api/sub-users', { username, name, password, subUserRole });
      setMessage('Sub-user created successfully.');
      setUsername('');
      setName('');
      setPassword('');
      setSubUserRole('menu');
      fetchSubUsers();
    } catch (error) {
      console.error('Error creating sub-user:', error);
      setMessage('Error creating sub-user.');
    }
  };

  const handleDeleteSubUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this sub-user?')) return;
    try {
      await axiosServices.post(`/api/sub-users/${id}/delete`);
      fetchSubUsers();
    } catch (error) {
      console.error('Error deleting sub-user:', error);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Manage Sub-Users
      </Typography>
      {message && (
        <Typography variant="body1" color="secondary" gutterBottom>
          {message}
        </Typography>
      )}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create New Sub-User
        </Typography>
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          fullWidth
          margin="normal"
        />
        <TextField
          select
          label="Sub-User Role"
          value={subUserRole}
          onChange={(e) => setSubUserRole(e.target.value)}
          fullWidth
          margin="normal"
        >
          <MenuItem value="menu">Menu Only (View Orders Only)</MenuItem>
          <MenuItem value="full">Full Control (Except Delete)</MenuItem>
        </TextField>
        <Button variant="contained" color="primary" onClick={handleCreateSubUser} sx={{ mt: 2 }}>
          Create Sub-User
        </Button>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sub-User ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.subUserRole}</TableCell>
                <TableCell align="center">
                  <Button variant="outlined" color="error" size="small" onClick={() => handleDeleteSubUser(user.id)}>
                    Delete
                  </Button>
                  {/* يمكنك إضافة زر التعديل إذا رغبت */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SubUserManagement;
