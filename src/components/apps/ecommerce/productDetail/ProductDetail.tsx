// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

// MUI Elements
import {
  Box,
  Grid,
  Typography,
  Chip,
  Button,
  Divider,
  Stack,
  useTheme,
  ButtonGroup,
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { addToCart } from 'src/store/apps/eCommerce/ECommerceSlice';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import AlertCart from 'src/components/apps/ecommerce/productCart/AlertCart';

const ProductDetail = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { productId, storeName } = useParams();

  // Get Products
  const products = useSelector((state) => state.ecommerceReducer.products);
  const product = products.find((p: { id: number | string }) => p.id.toString() === productId);

  //set qty
  const [count, setCount] = useState(1);

  // for alert when added something to cart
  const [cartalert, setCartalert] = React.useState(false);

  const handleClick = () => {
    setCartalert(true);
  };

  const handleClose = (reason: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setCartalert(false);
  };

  return (
    <Box p={2}>
      {product ? (
        <>
          <Box display="flex" alignItems="center">
            {/* ------------------------------------------- */}
            {/* Badge */}
            {/* ------------------------------------------- */}
            <Chip label="متوفر" color="success" size="small" />
          </Box>
          {/* ------------------------------------------- */}
          {/* Title */}
          {/* ------------------------------------------- */}
          <Typography fontWeight="600" variant="h4" mt={1}>
            {(product as { title?: string })?.title || ''}
          </Typography>
          <Typography variant="subtitle2" mt={1} color={theme.palette.text.secondary}>
            لا يوجد وصف متاح لهذا المنتج.
          </Typography>
          {/* ------------------------------------------- */}
          {/* Price */}
          {/* ------------------------------------------- */}
          <Typography mt={2} variant="h4" fontWeight={600}>
            ${(product as { price?: number })?.price ?? 0}
          </Typography>
          <Divider sx={{ my: 3 }} />
          {/* ------------------------------------------- */}
          {/* Qty */}
          {/* ------------------------------------------- */}
          <Stack direction="row" alignItems="center" pb={5}>
            <Typography variant="h6" mr={4}>
              الكمية:
            </Typography>
            <Box>
              <ButtonGroup size="small" color="secondary" aria-label="small button group">
                <Button key="one" onClick={() => setCount(count < 2 ? count : count - 1)}>
                  <IconMinus size="1.1rem" />
                </Button>
                <Button key="two">{count}</Button>
                <Button key="three" onClick={() => setCount(count + 1)}>
                  <IconPlus size="1.1rem" />
                </Button>
              </ButtonGroup>
            </Box>
          </Stack>
          <Divider />
          {/* ------------------------------------------- */}
          {/* Buttons */}
          {/* ------------------------------------------- */}
          <Grid container spacing={2} mt={3}>
            <Grid item xs={12} lg={4} md={6}>
              <Button
                color="primary"
                size="large"
                fullWidth
                component={Link}
                variant="contained"
                to={`/store/${storeName}/checkout`}
                onClick={() => {
                  const productWithQty = product ? { ...(product as object), qty: count } : { qty: count };
                  dispatch(addToCart(productWithQty));
                }}
              >
                شراء الآن
              </Button>
            </Grid>
            <Grid item xs={12} lg={4} md={6}>
              <Button
                color="error"
                size="large"
                fullWidth
                variant="contained"
                onClick={() => {
                  const productWithQty = product ? { ...(product as object), qty: count } : { qty: count };
                  dispatch(addToCart(productWithQty));
                  handleClick();
                }}
              >
                إضافة إلى السلة
              </Button>
            </Grid>
          </Grid>
          <Typography color="textSecondary" variant="body1" mt={4}>
            يتم الشحن خلال 2-3 أسابيع
          </Typography>
          <Link to="#" color="inherit">
            لماذا يستغرق التوصيل وقتًا أطول؟
          </Link>
          {/* ------------------------------------------- */}
          {/* Alert When click on add to cart */}
          {/* ------------------------------------------- */}
          <AlertCart handleClose={handleClose} openCartAlert={cartalert} />
        </>
      ) : (
        'المنتج غير موجود'
      )}
    </Box>
  );
};

export default ProductDetail;
