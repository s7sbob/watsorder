// src/components/apps/user/UserTable.tsx
import React from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip } from "@mui/material";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import CustomCheckbox from "src/components/forms/theme-elements/CustomCheckbox";
import { User } from "src/context/UserContext";

interface UserTableProps {
  users: User[];
  selectedUsers: number[];
  selectAll: boolean;
  toggleSelectAll: () => void;
  toggleSelectUser: (userId: number) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUsers,
  selectAll,
  toggleSelectAll,
  toggleSelectUser,
  onEditUser,
  onDeleteUser,
}) => {
  return (
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
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell padding="checkbox">
              <CustomCheckbox
                checked={selectedUsers.includes(user.id)}
                onChange={() => toggleSelectUser(user.id)}
              />
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
              <IconButton color="success" onClick={() => onEditUser(user)}>
                <IconEdit width={22} />
              </IconButton>
              <IconButton color="error" onClick={() => onDeleteUser(user.id)}>
                <IconTrash width={22} />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserTable;
