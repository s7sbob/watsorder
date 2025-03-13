// // src/components/apps/user/UserDetailsDialog.tsx
// import React from "react";
// import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
// import { User } from "src/context/UserContext";

// interface UserDetailsDialogProps {
//   open: boolean;
//   onClose: () => void;
//   user: User | null;
// }

// const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({ open, onClose, user }) => {
//   if (!user) return null;
//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//       <DialogTitle>User Details (ID: {user.id})</DialogTitle>
//       <DialogContent dividers>
//         <Typography variant="h6" gutterBottom>Basic Info</Typography>
//         <Typography>Name: {user.name}</Typography>
//         <Typography>Phone: {user.phoneNumber}</Typography>
//         <Typography>Subscription Type: {user.subscriptionType}</Typography>
//         <Typography>Subscription Start: {user.subscriptionStart}</Typography>
//         <Typography>Subscription End: {user.subscriptionEnd}</Typography>
//         <Typography>Status: {user.status || "N/A"}</Typography>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} variant="contained" color="primary">Close</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default UserDetailsDialog;
