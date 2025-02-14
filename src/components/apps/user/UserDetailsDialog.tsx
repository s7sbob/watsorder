// src/components/apps/user/UserDetailsDialog.tsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip
} from "@mui/material";
import { User, UserFeature, SubscriptionLog } from "src/context/UserContext";

interface UserDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  userFeatures: UserFeature[];
  subscriptionLogs: SubscriptionLog[];
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({
  open,
  onClose,
  user,
  userFeatures,
  subscriptionLogs
}) => {
  if (!user) return null; // لو لم يتم تعيين user بعد

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>User Details (ID: {user.id})</DialogTitle>

      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          Basic Info
        </Typography>
        <Typography>Name: {user.name}</Typography>
        <Typography>Username: {user.username}</Typography>
        <Typography>Subscription Type: {user.subscriptionType}</Typography>
        <Typography>Subscription Start: {user.subscriptionStart}</Typography>
        <Typography>Subscription End: {user.subscriptionEnd}</Typography>
        <Typography>Status: {user.status || "N/A"}</Typography>

        <hr style={{ margin: "1rem 0" }} />

        <Typography variant="h6" gutterBottom>
          Features
        </Typography>
        {userFeatures.length > 0 ? (
          userFeatures.map((f) => (
            <Chip
              key={f.id}
              label={`${f.featureName} (${f.isActive ? "Active" : "Inactive"})`}
              style={{ marginRight: 8, marginBottom: 8 }}
              color={f.isActive ? "success" : "default"}
              variant="outlined"
            />
          ))
        ) : (
          <Typography>No features assigned.</Typography>
        )}

        <hr style={{ margin: "1rem 0" }} />

        <Typography variant="h6" gutterBottom>
          Subscription Logs
        </Typography>
        {subscriptionLogs.length > 0 ? (
          subscriptionLogs.map((log) => (
            <div key={log.id} style={{ marginBottom: "0.5rem" }}>
              <Typography variant="body2">
                <strong>ChangedAt:</strong> {log.changedAt}<br/>
                <strong>Old:</strong> {log.oldSubscriptionType || "N/A"}{" "}
                <strong>New:</strong> {log.newSubscriptionType}<br/>
                <strong>ChangedBy (UserID):</strong> {log.changedBy}
                {log.notes && (
                  <>
                    <br/>
                    <strong>Notes:</strong> {log.notes}
                  </>
                )}
              </Typography>
            </div>
          ))
        ) : (
          <Typography>No logs found.</Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailsDialog;
