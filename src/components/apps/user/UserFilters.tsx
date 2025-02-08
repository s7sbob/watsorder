// src/components/apps/user/UserFilters.tsx
import React from "react";
import { Box, Grid, Stack, TextField, Button } from "@mui/material";
import { InputAdornment } from "@mui/material";
import { IconSearch, IconListDetails, IconShoppingBag, IconSortAscending, IconTruck } from "@tabler/icons-react";

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddUser: () => void;
}

const UserFilters: React.FC<UserFiltersProps> = ({ searchTerm, setSearchTerm, activeTab, setActiveTab, onAddUser }) => {
  return (
    <>
      <Grid container spacing={3} mb={3}>
        {/* كل صندوق يمثل تبويب */}
        <Grid item xs={12} sm={6} lg={3}>
          <Box bgcolor="primary.light" p={3} onClick={() => setActiveTab("All")} sx={{ cursor: "pointer" }}>
            <Stack direction="row" gap={2} alignItems="center">
              <Box
                width={38}
                height={38}
                bgcolor="primary.main"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconListDetails width={22} />
              </Box>
              <Box>
                <div>Total Users</div>
              </Box>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Box bgcolor="success.light" p={3} onClick={() => setActiveTab("Regular")} sx={{ cursor: "pointer" }}>
            <Stack direction="row" gap={2} alignItems="center">
              <Box
                width={38}
                height={38}
                bgcolor="success.main"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconShoppingBag width={22} />
              </Box>
              <Box>
                <div>Regular Subscription</div>
              </Box>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Box bgcolor="warning.light" p={3} onClick={() => setActiveTab("Premium")} sx={{ cursor: "pointer" }}>
            <Stack direction="row" gap={2} alignItems="center">
              <Box
                width={38}
                height={38}
                bgcolor="warning.main"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconSortAscending width={22} />
              </Box>
              <Box>
                <div>Premium Subscription</div>
              </Box>
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Box bgcolor="error.light" p={3} onClick={() => setActiveTab("Expired")} sx={{ cursor: "pointer" }}>
            <Stack direction="row" gap={2} alignItems="center">
              <Box
                width={38}
                height={38}
                bgcolor="error.main"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <IconTruck width={22} />
              </Box>
              <Box>
                <div>Expired Subscription</div>
              </Box>
            </Stack>
          </Box>
        </Grid>
      </Grid>
      <Stack direction="row" spacing={2} mt={3} mb={3}>
        <TextField
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" color="primary" onClick={onAddUser}>
          Add New User
        </Button>
      </Stack>
    </>
  );
};

export default UserFilters;
