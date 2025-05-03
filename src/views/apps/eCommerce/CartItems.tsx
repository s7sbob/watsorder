import React from 'react';
import {
  Box, Typography, Avatar, Stack, ButtonGroup, Button, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, IconButton
} from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { increment, decrement, deleteCart } from 'src/store/apps/eCommerce/ECommerceSlice';
import emptyCart from 'src/assets/images/products/empty-shopping-cart.svg';
import { ProductType } from 'src/types/apps/eCommerce'; // عدّل المسار حسب مكان ملف types

const CartItems: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const cart = useSelector((state: any) => state.ecommerceReducer.cart as ProductType[]);

  const Increase = (productId: number | string) => {
    dispatch(increment(productId));
  };

  const Decrease = (productId: number | string) => {
    dispatch(decrement(productId));
  };

  return (
    <Box>
      {cart.length > 0 ? (
        <Box>
          <TableContainer sx={{ minWidth: 350 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Ecommerce.product')}</TableCell>
                  <TableCell align="left">{t('Ecommerce.quantity')}</TableCell>
                  <TableCell align="right">{t('Ecommerce.price')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cart.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={2}>
                        <Avatar
                          src={product.photo}
                          alt={product.title}
                          sx={{
                            borderRadius: '10px',
                            height: '80px',
                            width: '90px',
                          }}
                        />
                        <Box>
                          <Typography variant="h6">{product.title}</Typography>
                          {typeof product.notes !== 'undefined' && product.notes && (
                            <Typography color="textSecondary" variant="body2">
                              {t('Ecommerce.notes')}: {product.notes}
                            </Typography>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => dispatch(deleteCart(product.id))}
                          >
                            <IconTrash size="1rem" />
                          </IconButton>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <ButtonGroup size="small" color="success" aria-label="small button group">
                        <Button onClick={() => Decrease(product.id)} disabled={product.qty < 2}>
                          <IconMinus stroke={1.5} size="0.8rem" />
                        </Button>
                        <Button>{product.qty}</Button>
                        <Button onClick={() => Increase(product.id)}>
                          <IconPlus stroke={1.5} size="0.8rem" />
                        </Button>
                      </ButtonGroup>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6">
                        {(product.price * product.qty).toFixed(2)} {t('Ecommerce.currency')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ) : (
        <Box textAlign="center" mb={3}>
          <img src={emptyCart} alt="cart" width="200px" />
          <Typography variant="h5" mb={2}>
            {t('Ecommerce.emptyCart')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default CartItems;
