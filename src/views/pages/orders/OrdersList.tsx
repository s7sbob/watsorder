import React, { useState, useEffect } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  IconButton,
  Chip,
  Box,
  Typography,
  Grid,
  Stack,
  TextField,
  InputAdornment,
  MenuItem
} from "@mui/material";
import { IconEye, IconCheck, IconSearch, IconEdit, IconTrash } from "@tabler/icons-react";
import axiosServices from "src/utils/axios";
import CustomCheckbox from "src/components/forms/theme-elements/CustomCheckbox";
import { DatePicker } from "@mui/x-date-pickers/DatePicker"; 
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

interface OrderType {
  items: any;
  id: number;
  customerPhone: string;
  deliveryAddress: string;
  totalPrice: number;
  status: string;
  createdAt?: string;
  // إضافة خصائص أخرى إذا لزم الأمر
}

function OrdersList() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderType | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  // States for dialogs and details
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axiosServices.get<OrderType[]>("/api/orders/confirmed");
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders", error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    // يمكنك إضافة فلاتر بناءً على الحالة أو غيرها
    return (
      order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    if (newSelectAll) {
      setSelectedOrders(filteredOrders.map((order) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleDelete = () => {
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    for (const orderId of selectedOrders) {
      // قم بحذف الطلب عبر API إذا كان موجوداً
      await axiosServices.delete(`/api/orders/${orderId}`);
    }
    setSelectedOrders([]);
    setSelectAll(false);
    setOpenDeleteDialog(false);
    fetchOrders();
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleEdit = (order: OrderType) => {
    setCurrentOrder(order);
    setOpenEditDialog(true);
  };

  const handleEditSave = async () => {
    if (currentOrder) {
      // قم بتحديث الطلب عبر API إذا أردت
      await axiosServices.put(`/api/orders/${currentOrder.id}`, currentOrder);
      fetchOrders();
    }
    setOpenEditDialog(false);
  };

  const handleAddOrder = () => {
    setCurrentOrder({
      id: 0,
      customerPhone: "",
      deliveryAddress: "",
      totalPrice: 0,
      status: "IN_CART",
      items: ""
    });
    setOpenAddDialog(true);
  };

  const handleAddSave = async () => {
    if (currentOrder) {
      await axiosServices.post(`/api/orders`, currentOrder);
      fetchOrders();
    }
    setOpenAddDialog(false);
  };

  const handleViewDetails = async (orderId: number) => {
    try {
      const res = await axiosServices.get(`/api/orders/${orderId}`);
      setOrderDetails(res.data);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching order details", error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* يمكنك إضافة فلاتر بحسب الحالة هنا */}

        <Stack direction="row" spacing={2} mt={3} mb={3}>
          <TextField
            placeholder="Search by phone or address"
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
          <Button variant="contained" color="primary" onClick={handleAddOrder}>
            Add New Order
          </Button>
        </Stack>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <CustomCheckbox checked={selectAll} onChange={toggleSelectAll} />
              </TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Total Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell padding="checkbox">
                  <CustomCheckbox
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => toggleSelectOrder(order.id)}
                  />
                </TableCell>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customerPhone}</TableCell>
                <TableCell>{order.deliveryAddress}</TableCell>
                <TableCell>{order.totalPrice}</TableCell>
                <TableCell>
                  {order.status === "CONFIRMED" ? (
                    <Chip color="success" label="Confirmed" size="small" />
                  ) : (
                    <Chip color="default" label={order.status} size="small" />
                  )}
                </TableCell>
                <TableCell>{order.createdAt}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton color="primary" onClick={() => handleViewDetails(order.id)}>
                      <IconEye size={22} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Order">
                    <IconButton color="success" onClick={() => handleEdit(order)}>
                      <IconEdit width={22} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Order">
                    <IconButton color="error" onClick={handleDelete}>
                      <IconTrash width={22} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Delete Confirmation Dialog */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Delete Orders</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete selected orders?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleConfirmDelete} variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Customer Phone"
              value={currentOrder?.customerPhone}
              onChange={(e) =>
                setCurrentOrder((prev) => (prev ? { ...prev, customerPhone: e.target.value } : prev))
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Delivery Address"
              value={currentOrder?.deliveryAddress}
              onChange={(e) =>
                setCurrentOrder((prev) => (prev ? { ...prev, deliveryAddress: e.target.value } : prev))
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Total Price"
              type="number"
              value={currentOrder?.totalPrice}
              onChange={(e) =>
                setCurrentOrder((prev) =>
                  prev ? { ...prev, totalPrice: +e.target.value } : prev
                )
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Status"
              select
              value={currentOrder?.status}
              onChange={(e) =>
                setCurrentOrder((prev) =>
                  prev ? { ...prev, status: e.target.value } : prev
                )
              }
              margin="normal"
            >
              <MenuItem value="IN_CART">In Cart</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSave} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Order Dialog - اختياري */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
          <DialogTitle>Add New Order</DialogTitle>
          <DialogContent>
            {/* حقول لإدخال بيانات الطلب الجديد */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSave} variant="contained" color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Order Details #{orderDetails?.id}</DialogTitle>
          <DialogContent>
            {orderDetails && (
              <Box>
                <Typography><strong>Customer Phone:</strong> {orderDetails.customerPhone}</Typography>
                <Typography><strong>Delivery Address:</strong> {orderDetails.deliveryAddress}</Typography>
                <Typography><strong>Total Price:</strong> {orderDetails.totalPrice}</Typography>
                <Typography><strong>Status:</strong> {orderDetails.status}</Typography>
                <Typography><strong>Created At:</strong> {orderDetails.createdAt}</Typography>
                <Typography variant="h6" mt={2}>Items:</Typography>
                {orderDetails?.items?.map((item: any, idx: any) => (
  <Typography key={idx}>
    {item.quantity} x {item.productName} = {item.price}
  </Typography>
))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}

export default OrdersList;
