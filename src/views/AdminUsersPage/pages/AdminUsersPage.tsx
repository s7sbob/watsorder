import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'src/utils/axios';
import { Box, Button, Typography, CircularProgress, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  Message as MessageIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import AddUserDialog from '../components/AddUserDialog';
import EditUserDialog from '../components/EditUserDialog';
import { UserContext } from 'src/context/UserContext';

export interface User {
  ID: number;
  name: string;
  phoneNumber: string;
  createdAt: string;
  subscriptionType: string;
  activeSessions: number;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  parentId?: number;
  maxSessions?: number;
  subUserRole?: string;
}

const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const userContext = useContext(UserContext);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // التأكد من أن المستخدم الحالي مشرف
  if (!userContext || !userContext.isAdmin()) {
    return <Typography variant="h6">{t('notAuthorized') as string}</Typography>;
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: number) => {
    if (window.confirm(t('confirmDeleteUser') as string)) {
      try {
        await axios.post(`/api/users/${userId}/delete`);
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleBan = async (user: User) => {
    if (window.confirm(t('confirmBanUser') as string)) {
      try {
        await axios.post(`/api/users/${user.ID}/update`, {
          name: user.name,
          subscriptionStart: user.subscriptionStart,
          subscriptionEnd: user.subscriptionEnd,
          subscriptionType: 'banned',
          parentId: user.parentId,
          maxSessions: user.maxSessions,
          subUserRole: user.subUserRole,
          phoneNumber: user.phoneNumber,
        });
        fetchUsers();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleMessage = (_row: User) => {
    const message = window.prompt(t('enterMessage') as string);
    if (message) {
      // هنا يمكن استدعاء endpoint لإرسال الرسالة فعلياً
      alert(t('messageSent') as string);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleAddUserSuccess = () => {
    setAddDialogOpen(false);
    fetchUsers();
  };

  const handleEditUserSuccess = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const columns: GridColDef<User>[] = [
    { field: 'name', headerName: t('name') as string, flex: 1 },
    { field: 'phoneNumber', headerName: t('phoneNumber') as string, flex: 1 },
    {
      field: 'createdAt',
      headerName: t('createdAt') as string,
      flex: 1,
      renderCell: (params: GridRenderCellParams<User, string>) =>
        params.value ? new Date(params.value).toLocaleString() : '',
    },
    { field: 'subscriptionType', headerName: t('role') as string, flex: 1 },
    {
      field: 'activeSessions',
      headerName: t('activeSessions') as string,
      flex: 1,
      valueGetter: (params: any) => params?.row?.activeSessions ?? 0,
    },
    {
      field: 'actions',
      headerName: t('actions') as string,
      flex: 1,
      sortable: false,
      renderCell: (params: GridRenderCellParams<User>) => {
        const row = params.row;
        return (
          <>
            <IconButton
              color="primary"
              onClick={() => handleEdit(row)}
              title={t('edit') as string}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={() => handleDelete(row.ID)}
              title={t('delete') as string}
            >
              <DeleteIcon />
            </IconButton>
            <IconButton
              color="warning"
              onClick={() => handleBan(row)}
              title={t('ban') as string}
            >
              <BlockIcon />
            </IconButton>
            <IconButton
              color="info"
              onClick={() => handleMessage(row)}
              title={t('message') as string}
            >
              <MessageIcon />
            </IconButton>
          </>
        );
      },
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        {t('manageUsers') as string}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => setAddDialogOpen(true)}
        sx={{ mb: 2 }}
      >
        {t('addUser') as string}
      </Button>
      {loading ? (
        <CircularProgress />
      ) : (
        <div style={{ height: 500, width: '100%' }}>
          <DataGrid<User>
            rows={users}
            columns={columns}
            getRowId={(row) => row.ID}
            paginationModel={{ pageSize: 10, page: 0 }}
            onPaginationModelChange={() => {}}
            disableRowSelectionOnClick
          />
        </div>
      )}
      <AddUserDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={handleAddUserSuccess}
      />
      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          user={selectedUser}
          onClose={() => setEditDialogOpen(false)}
          onSuccess={handleEditUserSuccess}
        />
      )}
    </Box>
  );
};

export default AdminUsersPage;
