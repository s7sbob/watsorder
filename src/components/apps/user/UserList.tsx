// src/components/apps/user/UserList.tsx
import { useContext, useState, useEffect } from "react";
import { UserContext, User } from "src/context/UserContext";
import { Box } from "@mui/material";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDialog from "./UserDialog";
import axiosServices from "src/utils/axios";

const UserList = () => {
  const { users, addUser, updateUser, deleteUser, fetchUsers } = useContext(UserContext)!;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // للحوار (Dialog) الخاص بالتحرير أو الإضافة
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  useEffect(() => {
    fetchUsers();
    // تأكد من أن التوكن الخاص بالمستخدم يحمل subscriptionType:"admin"
  }, []);

  // تصفية المستخدمين حسب التبويب وكلمة البحث
  const filteredUsers = users
    .filter((user) => {
      if (activeTab === "All") return true;
      return user.subscriptionType === activeTab;
    })
    .filter((user) => user.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // دوال تحديد المستخدمين
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

  // فتح الحوار للإضافة
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
    setDialogMode("add");
    setOpenDialog(true);
  };

  // فتح الحوار للتحرير
  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setDialogMode("edit");
    setOpenDialog(true);
  };

  // حفظ التعديلات أو الإضافة
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

  // حذف مستخدم
  const handleDelete = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axiosServices.delete(`/api/users/${userId}`);
        await fetchUsers();
      } catch (error) {
        console.error("Error deleting user", error);
      }
    }
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
      <UserTable
        users={filteredUsers}
        selectedUsers={selectedUsers}
        selectAll={selectAll}
        toggleSelectAll={toggleSelectAll}
        toggleSelectUser={toggleSelectUser}
        onEditUser={handleEdit}
        onDeleteUser={handleDelete}
      />
      <UserDialog
        open={openDialog}
        user={currentUser}
        setUser={setCurrentUser}
        onClose={() => setOpenDialog(false)}
        onSave={handleDialogSave}
        mode={dialogMode}
      />
    </Box>
  );
};

export default UserList;
