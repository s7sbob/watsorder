// // src/components/apps/user/UserFilters.tsx
// import React from "react";
// import { Box, Grid, Stack, TextField, Button, InputAdornment } from "@mui/material";
// import { IconSearch } from "@tabler/icons-react";

// interface UserFiltersProps {
//   searchTerm: string;
//   setSearchTerm: (term: string) => void;
//   activeTab: string;
//   setActiveTab: (tab: string) => void;
//   onAddUser: () => void;
// }

// const UserFilters: React.FC<UserFiltersProps> = ({ searchTerm, setSearchTerm, activeTab, setActiveTab, onAddUser }) => {
//   return (
//     <>
//       <Grid container spacing={3} mb={3}>
//         <Grid item xs={12} sm={6} lg={3}>
//           <Box bgcolor="primary.light" p={3} onClick={() => setActiveTab("All")} sx={{ cursor: "pointer" }}>
//             <Stack direction="row" gap={2} alignItems="center">
//               <Box width={38} height={38} bgcolor="primary.main" display="flex" alignItems="center" justifyContent="center">
//                 All
//               </Box>
//               <Box>Total Users</Box>
//             </Stack>
//           </Box>
//         </Grid>
//         <Grid item xs={12} sm={6} lg={3}>
//           <Box bgcolor="success.light" p={3} onClick={() => setActiveTab("Regular")} sx={{ cursor: "pointer" }}>
//             <Stack direction="row" gap={2} alignItems="center">
//               <Box width={38} height={38} bgcolor="success.main" display="flex" alignItems="center" justifyContent="center">
//                 R
//               </Box>
//               <Box>Regular</Box>
//             </Stack>
//           </Box>
//         </Grid>
//         <Grid item xs={12} sm={6} lg={3}>
//           <Box bgcolor="warning.light" p={3} onClick={() => setActiveTab("Premium")} sx={{ cursor: "pointer" }}>
//             <Stack direction="row" gap={2} alignItems="center">
//               <Box width={38} height={38} bgcolor="warning.main" display="flex" alignItems="center" justifyContent="center">
//                 P
//               </Box>
//               <Box>Premium</Box>
//             </Stack>
//           </Box>
//         </Grid>
//         <Grid item xs={12} sm={6} lg={3}>
//           <Box bgcolor="error.light" p={3} onClick={() => setActiveTab("Expired")} sx={{ cursor: "pointer" }}>
//             <Stack direction="row" gap={2} alignItems="center">
//               <Box width={38} height={38} bgcolor="error.main" display="flex" alignItems="center" justifyContent="center">
//                 E
//               </Box>
//               <Box>Expired</Box>
//             </Stack>
//           </Box>
//         </Grid>
//       </Grid>
//       <Stack direction="row" spacing={2} mt={3} mb={3}>
//         <TextField
//           placeholder="Search"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           InputProps={{
//             endAdornment: (
//               <InputAdornment position="end">
//                 <IconSearch size={16} />
//               </InputAdornment>
//             )
//           }}
//         />
//         <Button variant="contained" color="primary" onClick={onAddUser}>
//           Add New User
//         </Button>
//       </Stack>
//     </>
//   );
// };

// export default UserFilters;
