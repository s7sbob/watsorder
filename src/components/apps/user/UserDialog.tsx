// // src/components/apps/user/UserDialog.tsx
// import React from "react";
// import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { User } from "src/context/UserContext";

// interface UserDialogProps {
//   open: boolean;
//   user: User | null;
//   setUser: (user: User | null) => void;
//   onClose: () => void;
//   onSave: () => void;
//   mode: "add" | "edit";
// }

// const UserDialog: React.FC<UserDialogProps> = ({ open, user, setUser, onClose, onSave, mode }) => {
//   return (
//     <LocalizationProvider dateAdapter={AdapterDateFns}>
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>{mode === "edit" ? "Edit User" : "Add New User"}</DialogTitle>
//         <DialogContent>
//           <TextField
//             fullWidth
//             label="Name"
//             value={user?.name || ""}
//             onChange={(e) => setUser({ ...user!, name: e.target.value })}
//             margin="normal"
//           />

//           <TextField
//             fullWidth
//             label="Password"
//             type="password"
//             value={user?.password || ""}
//             onChange={(e) => setUser({ ...user!, password: e.target.value })}
//             margin="normal"
//           />
//           <TextField
//             fullWidth
//             label="Phone Number"
//             value={user?.phoneNumber || ""}
//             onChange={(e) => setUser({ ...user!, phoneNumber: e.target.value })}
//             margin="normal"
//           />
//           <TextField
//             fullWidth
//             label="Subscription Type"
//             select
//             value={user?.subscriptionType || "free"}
//             onChange={(e) => setUser({ ...user!, subscriptionType: e.target.value })}
//             margin="normal"
//           >
//             <MenuItem value="free">Free</MenuItem>
//             <MenuItem value="Regular">Regular</MenuItem>
//             <MenuItem value="Premium">Premium</MenuItem>
//             <MenuItem value="Expired">Expired</MenuItem>
//           </TextField>
//           <DatePicker
//             label="Subscription Start"
//             value={user?.subscriptionStart ? new Date(user.subscriptionStart) : null}
//             onChange={(date) =>
//               setUser({ ...user!, subscriptionStart: date ? date.toISOString().split("T")[0] : "" })
//             }
//             renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
//           />
//           <DatePicker
//             label="Subscription End"
//             value={user?.subscriptionEnd ? new Date(user.subscriptionEnd) : null}
//             onChange={(date) =>
//               setUser({ ...user!, subscriptionEnd: date ? date.toISOString().split("T")[0] : "" })
//             }
//             renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
//           />
//           <TextField
//             fullWidth
//             label="Status"
//             value={user?.status || ""}
//             onChange={(e) => setUser({ ...user!, status: e.target.value })}
//             margin="normal"
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose}>Cancel</Button>
//           <Button onClick={onSave} variant="contained" color="primary">
//             {mode === "edit" ? "Save" : "Add"}
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </LocalizationProvider>
//   );
// };

// export default UserDialog;
