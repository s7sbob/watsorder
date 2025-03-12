// src/components/apps/user/UserList.tsx
import { useContext, useState, useEffect } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton } from "@mui/material";
import CustomCheckbox from "src/components/forms/theme-elements/CustomCheckbox";
import { IconEdit, IconTrash, IconList } from "@tabler/icons-react";
import UserFilters from "./UserFilters";
import UserDialog from "./UserDialog";
import UserDetailsDialog from "./UserDetailsDialog";
import { UserContext, User } from "src/context/UserContext";

const UserList = () => {
  const { users, updateUser, addUser, fetchUsers, isAdmin, deleteUser } = useContext(UserContext)!;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // للدialog الخاص بالإضافة والتعديل
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  // للدialog الخاص بالتفاصيل
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
    .filter((user) => {
      if (activeTab === "All") return true;
      return user.subscriptionType === activeTab;
    })
    

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

  const handleAddUser = () => {
    setCurrentUser({
      id: 0,
      name: "",
      password: "",
      subscriptionType: "free",
      subscriptionStart: new Date().toISOString().split("T")[0],
      subscriptionEnd: "",
      status: "",
      phoneNumber: ""
    });
    setDialogMode("add");
    setOpenDialog(true);
  };

  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setDialogMode("edit");
    setOpenDialog(true);
  };

  const handleDialogSave = async () => {
    if (currentUser) {
      if (dialogMode === "edit") {
        await updateUser(currentUser);
      } else {
        await addUser(currentUser);
      }
      await fetchUsers();
    }
    setOpenDialog(false);
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await deleteUser(userId);
      await fetchUsers();
    }
  };

  const handleShowDetails = (user: User) => {
    setDetailsUser(user);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
    setDetailsUser(null);
  };

  return (
    <Box>
      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddUser={handleAddUser}
      />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <CustomCheckbox checked={selectAll} onChange={toggleSelectAll} />
            </TableCell>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Phone</TableCell>
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
                <CustomCheckbox
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleSelectUser(user.id)}
                />
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.phoneNumber}</TableCell>
              <TableCell>{user.subscriptionType}</TableCell>
              <TableCell>{user.subscriptionStart}</TableCell>
              <TableCell>{user.subscriptionEnd}</TableCell>
              <TableCell>{user.status || "N/A"}</TableCell>
              <TableCell align="center">
                <IconButton color="success" onClick={() => handleEdit(user)}>
                  <IconEdit width={22} />
                </IconButton>
                {isAdmin() && (
                  <IconButton color="error" onClick={() => handleDelete(user.id)}>
                    <IconTrash width={22} />
                  </IconButton>
                )}
                <IconButton color="info" onClick={() => handleShowDetails(user)}>
                  <IconList width={22} />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <UserDialog
        open={openDialog}
        user={currentUser}
        setUser={setCurrentUser}
        onClose={() => setOpenDialog(false)}
        onSave={handleDialogSave}
        mode={dialogMode}
      />
      <UserDetailsDialog
        open={openDetails}
        onClose={handleCloseDetails}
        user={detailsUser}
      />
    </Box>
  );
};

export default UserList;
