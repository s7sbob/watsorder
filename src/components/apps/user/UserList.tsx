import React, { useContext, useState, useEffect } from "react";
import { UserContext, User } from "src/context/UserContext";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  IconButton,
  Chip,
  Box,
  Typography,
  Grid,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { IconEdit, IconTrash, IconSearch, IconListDetails, IconShoppingBag, IconSortAscending, IconTruck } from "@tabler/icons-react";
import CustomCheckbox from "src/components/forms/theme-elements/CustomCheckbox";

function UserList() {
  const { users, addUser, updateUser, deleteUser, fetchUsers } = useContext(UserContext)!;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
  .filter((user) => {
    if (activeTab === "All") return true;
    return user.subscriptionType === activeTab;
  })
  .filter((user) => {
    return user.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    if (newSelectAll) {
      setSelectedUsers(users.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleDelete = () => {
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    for (const userId of selectedUsers) {
      await deleteUser(userId);
    }
    setSelectedUsers([]);
    setSelectAll(false);
    setOpenDeleteDialog(false);
    await fetchUsers();
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setOpenEditDialog(true);
  };

  const handleEditSave = async () => {
    if (currentUser) {
      await updateUser(currentUser);
      await fetchUsers();
    }
    setOpenEditDialog(false);
  };

  const handleAddUser = () => {
    setCurrentUser({
      id: 0,
      name: "",
      username: "",
      password: "",
      subscriptionType: "free",
      subscriptionStart: new Date().toISOString().split("T")[0],
      subscriptionEnd: "",
      status: "",
    });
    setOpenAddDialog(true);
  };

  const handleAddSave = async () => {
    if (currentUser) {
      await addUser(currentUser);
      await fetchUsers();
    }
    setOpenAddDialog(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Filters */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} lg={3}>
            <Box bgcolor="primary.light" p={3} onClick={() => setActiveTab("All")} sx={{ cursor: "pointer" }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Box width={38} height={38} bgcolor="primary.main" display="flex" alignItems="center" justifyContent="center">
                  <Typography color="primary.contrastText">
                    <IconListDetails width={22} />
                  </Typography>
                </Box>
                <Box>
                  <Typography>Total Users</Typography>
                  <Typography fontWeight={500}>{users.length}</Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Box bgcolor="success.light" p={3} onClick={() => setActiveTab("Regular")} sx={{ cursor: "pointer" }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Box width={38} height={38} bgcolor="success.main" display="flex" alignItems="center" justifyContent="center">
                  <Typography color="primary.contrastText">
                    <IconShoppingBag width={22} />
                  </Typography>
                </Box>
                <Box>
                  <Typography>Regular Subscription</Typography>
                  <Typography fontWeight={500}>
                    {users.filter((user) => user.subscriptionType === "Regular").length}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Box bgcolor="warning.light" p={3} onClick={() => setActiveTab("Premium")} sx={{ cursor: "pointer" }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Box width={38} height={38} bgcolor="warning.main" display="flex" alignItems="center" justifyContent="center">
                  <Typography color="primary.contrastText">
                    <IconSortAscending width={22} />
                  </Typography>
                </Box>
                <Box>
                  <Typography>Premium Subscription</Typography>
                  <Typography fontWeight={500}>
                    {users.filter((user) => user.subscriptionType === "Premium").length}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <Box bgcolor="error.light" p={3} onClick={() => setActiveTab("Expired")} sx={{ cursor: "pointer" }}>
              <Stack direction="row" gap={2} alignItems="center">
                <Box width={38} height={38} bgcolor="error.main" display="flex" alignItems="center" justifyContent="center">
                  <Typography color="primary.contrastText">
                    <IconTruck width={22} />
                  </Typography>
                </Box>
                <Box>
                  <Typography>Expired Subscription</Typography>
                  <Typography fontWeight={500}>
                    {users.filter((user) => user.subscriptionType === "Expired").length}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} mt={3} mb={3}>
          <TextField
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" color="primary" onClick={handleAddUser}>
            Add New User
          </Button>
        </Stack>

        {/* Users Table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <CustomCheckbox checked={selectAll} onChange={toggleSelectAll} />
              </TableCell>
              <TableCell>Id</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Subscription Type</TableCell>
              <TableCell>Subscription Start</TableCell>
              <TableCell>Subscription End</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell padding="checkbox">
                  <CustomCheckbox checked={selectedUsers.includes(user.id)} onChange={() => toggleSelectUser(user.id)} />
                </TableCell>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.subscriptionType}</TableCell>
                <TableCell>{user.subscriptionStart}</TableCell>
                <TableCell>{user.subscriptionEnd}</TableCell>
                <TableCell>
                  {user.subscriptionType === "Regular" ? (
                    <Chip color="success" label="Regular" size="small" />
                  ) : user.subscriptionType === "Premium" ? (
                    <Chip color="warning" label="Premium" size="small" />
                  ) : user.subscriptionType === "Expired" ? (
                    <Chip color="error" label="Expired" size="small" />
                  ) : (
                    <Chip color="default" label="Free" size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Edit User">
                    <IconButton color="success" onClick={() => handleEdit(user)}>
                      <IconEdit width={22} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete User">
                    <IconButton color="error" onClick={handleDelete}>
                      <IconTrash width={22} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit User Dialog */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>Edit User</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={currentUser?.name}
              onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Username"
              value={currentUser?.username}
              onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={currentUser?.password}
              onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Subscription Type"
              select
              value={currentUser?.subscriptionType}
              onChange={(e) => setCurrentUser({ ...currentUser, subscriptionType: e.target.value } as User)}
              margin="normal"
            >
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="Regular">Regular</MenuItem>
              <MenuItem value="Premium">Premium</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </TextField>
            <DatePicker
              label="Subscription Start"
              value={currentUser?.subscriptionStart ? new Date(currentUser.subscriptionStart) : null}
              onChange={(date) => setCurrentUser({ ...currentUser, subscriptionStart: date?.toISOString().split("T")[0] } as User)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
            <DatePicker
              label="Subscription End"
              value={currentUser?.subscriptionEnd ? new Date(currentUser.subscriptionEnd) : null}
              onChange={(date) => setCurrentUser({ ...currentUser, subscriptionEnd: date?.toISOString().split("T")[0] } as User)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={currentUser?.name}
              onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Username"
              value={currentUser?.username}
              onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={currentUser?.password}
              onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value } as User)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Subscription Type"
              select
              value={currentUser?.subscriptionType}
              onChange={(e) => setCurrentUser({ ...currentUser, subscriptionType: e.target.value } as User)}
              margin="normal"
            >
              <MenuItem value="free">Free</MenuItem>
              <MenuItem value="Regular">Regular</MenuItem>
              <MenuItem value="Premium">Premium</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </TextField>
            <DatePicker
              label="Subscription Start"
              value={currentUser?.subscriptionStart ? new Date(currentUser.subscriptionStart) : null}
              onChange={(date) => setCurrentUser({ ...currentUser, subscriptionStart: date?.toISOString().split("T")[0] } as User)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
            <DatePicker
              label="Subscription End"
              value={currentUser?.subscriptionEnd ? new Date(currentUser.subscriptionEnd) : null}
              onChange={(date) => setCurrentUser({ ...currentUser, subscriptionEnd: date?.toISOString().split("T")[0] } as User)}
              renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSave} variant="contained" color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default UserList;
