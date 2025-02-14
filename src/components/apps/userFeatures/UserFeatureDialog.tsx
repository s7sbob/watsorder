import React, { useContext, useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { UserContext, UserFeature } from "src/context/UserContext";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  feature: UserFeature | null; // عند التعديل
  userId: number;
}

const UserFeatureDialog: React.FC<Props> = ({ open, onClose, mode, feature, userId }) => {
  const { features, addFeatureToUser, updateUserFeature } = useContext(UserContext)!;

  // لو إضافة، نختار featureId من قائمة features
  const [featureId, setFeatureId] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  // التواريخ
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  // للرسائل أو الأخطاء
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    setErrorMessage(""); // تصفير رسالة الخطأ عند الفتح
    if (mode === "edit" && feature) {
      // تعبئة القيم من الـ feature
      setFeatureId(feature.featureId);
      setIsActive(feature.isActive);
      setStartDate(feature.startDate ? new Date(feature.startDate) : null);
      setEndDate(feature.endDate ? new Date(feature.endDate) : null);
    } else {
      // في وضع الإضافة
      setFeatureId(features[0]?.id); // قد تكون رقم أو undefined
      setIsActive(true);
      setStartDate(new Date());
      setEndDate(null);
    }
  }, [mode, feature, features]);

  const handleSave = async () => {
    // 1) التحقق من وجود featureId (عند الإضافة)
    if (mode === "add" && (!features.length || !featureId)) {
      setErrorMessage("No features available or no feature selected.");
      return;
    }

    // 2) التحقق من التواريخ
    if (startDate && endDate && endDate < startDate) {
      setErrorMessage("End Date cannot be before Start Date.");
      return;
    }

    // 3) تنفيذ العملية
    try {
      if (mode === "add") {
        await addFeatureToUser(userId, {
          featureId: featureId!,
          startDate: startDate ? startDate.toISOString() : new Date().toISOString(),
          endDate: endDate ? endDate.toISOString() : undefined,
        });
      } else if (mode === "edit" && feature) {
        await updateUserFeature(feature.id, {
          featureId,
          isActive,
          startDate: startDate ? startDate.toISOString() : new Date().toISOString(),
          endDate: endDate ? endDate.toISOString() : null,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage("Error while saving changes: " + (err.message || ""));
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>{mode === "add" ? "Add Feature" : "Edit Feature"}</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {mode === "add" && (
            <TextField
              select
              label="Feature"
              fullWidth
              margin="normal"
              value={featureId || ""}
              onChange={(e) => setFeatureId(Number(e.target.value))}
            >
              {features.map((feat) => (
                <MenuItem key={feat.id} value={feat.id}>
                  {feat.featureName}
                </MenuItem>
              ))}
            </TextField>
          )}

          {mode === "edit" && feature && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <strong>Feature:</strong> {feature.featureName}
            </div>
          )}

          {mode === "edit" && (
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Is Active?"
            />
          )}

          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(date) => setEndDate(date)}
            renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {mode === "add" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default UserFeatureDialog;
