import { useContext, useEffect, useState } from "react";
import { UserContext, UserFeature } from "src/context/UserContext";
import { Box, Button, Typography } from "@mui/material";
import UserFeatureTable from "./UserFeatureTable";
import UserFeatureDialog from "./UserFeatureDialog";

interface Props {
  userId: number;
}

const UserFeatureList: React.FC<Props> = ({ userId }) => {
  const {
    userFeatures,
    fetchUserFeatures,
    deleteUserFeature,
    // لم نعد نستدعي fetchUserFeatures بعد الحذف لأن الدالة في الـ Context تفعله
  } = useContext(UserContext)!;

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingFeature, setEditingFeature] = useState<UserFeature | null>(null);

  useEffect(() => {
    // جلب ميزات هذا المستخدم في أول مرة
    fetchUserFeatures(userId);
  }, [userId]);

  const handleAdd = () => {
    setEditingFeature(null);
    setDialogMode("add");
    setOpenDialog(true);
  };

  const handleEdit = (feature: UserFeature) => {
    setEditingFeature(feature);
    setDialogMode("edit");
    setOpenDialog(true);
  };

  const handleDelete = async (userFeatureId: number) => {
    if (window.confirm("Are you sure you want to remove this feature from user?")) {
      await deleteUserFeature(userFeatureId);
      // لا نحتاج fetchUserFeatures(userId) ثانية لأننا نفعلها في الـ Context
    }
  };

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom>
        User Features
      </Typography>
      <Button variant="contained" color="primary" onClick={handleAdd} sx={{ mb: 2 }}>
        Add Feature
      </Button>

      <UserFeatureTable
        features={userFeatures}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {openDialog && (
        <UserFeatureDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          mode={dialogMode}
          feature={editingFeature}
          userId={userId}
        />
      )}
    </Box>
  );
};

export default UserFeatureList;
