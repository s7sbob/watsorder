// src/components/apps/user/UserList.tsx
import { useContext, useState, useEffect } from "react";
import { Box } from "@mui/material";

import axiosServices from "src/utils/axios";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDialog from "./UserDialog";
import UserDetailsDialog from "./UserDetailsDialog";

import { UserContext, User, UserFeature, SubscriptionLog } from "src/context/UserContext";

const UserList = () => {
  const { users, addUser, updateUser, fetchUsers, isAdmin, fetchUserFeatures, fetchSubscriptionLogs, userFeatures, subscriptionLogsMap } = useContext(UserContext)!;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // للحوار الخاص بتحرير المستخدم
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  // للحوار الخاص بعرض التفاصيل (الميزات + السجل)
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  // سنخزن الميزات (الخاصة بالمستخدم المختار) في حالة محلية عند الفتح
  const [userFeaturesState, setUserFeaturesState] = useState<UserFeature[]>([]);
  const [userLogsState, setUserLogsState] = useState<SubscriptionLog[]>([]);

  useEffect(() => {
    fetchUsers();
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

  // فتح حوار إضافة مستخدم
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

  // فتح حوار تعديل مستخدم
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
        await axiosServices.post(`/api/users/${userId}`);
        await fetchUsers();
      } catch (error) {
        console.error("Error deleting user", error);
      }
    }
  };

  // فتح حوار التفاصيل
  const handleShowDetails = async (user: User) => {
    setDetailsUser(user);
    setOpenDetails(true);

    // جلب الميزات + السجل
    await fetchUserFeatures(user.id);
    await fetchSubscriptionLogs(user.id);

    // بعد الجلب, نأخذ من context.userFeatures (لكن لاحظ أنه لكل userId)
    // إن كنت في userContext تخزن "userFeatures" لكل مستخدم على حدة, سنستخدمه مباشرة.
    // لكن حالياً userFeatures هي آخر مستخدم طلبناه، فسننسخه:
    setUserFeaturesState([...userFeatures]);

    // بالنسبة للسجل: subscriptionLogsMap[user.id]
    setUserLogsState(subscriptionLogsMap[user.id] || []);
  };

  // عند غلق الديالوج
  const handleCloseDetails = () => {
    setOpenDetails(false);
    setDetailsUser(null);
    setUserFeaturesState([]);
    setUserLogsState([]);
  };

  // إذا كان العنوان admin, نعرض بقية الأزرار...
  // بقية الأكواد
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
        isAdmin={isAdmin()}
        onShowDetails={handleShowDetails}  // جديد
      />

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
        userFeatures={userFeaturesState}
        subscriptionLogs={userLogsState}
      />
    </Box>
  );
};

export default UserList;
