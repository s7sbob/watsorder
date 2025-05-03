// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import { orderBy } from 'lodash';
import {
  Box, Grid, Stack, Typography,
  Fab, Tooltip
} from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import {
  addToCart,
} from 'src/store/apps/eCommerce/ECommerceSlice';
import ProductSearch from './ProductSearch';
import { IconBasket } from '@tabler/icons-react';
import AlertCart from 'src/components/apps/ecommerce/productCart/AlertCart';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import ProductPopup from './ProductPopup';

interface Props {
  onCartUpdate: () => void;
}

const ProductList: React.FC<Props> = ({ onCartUpdate }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [cartAlert, setCartAlert] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const getVisibleProduct = (
    products: any[],
    sortBy: string,
    filters: any,
    search: string,
  ) => {
    // SORT BY
    if (sortBy === 'newest') {
      products = orderBy(products, ['id'], ['desc']);
    }
    if (sortBy === 'priceDesc') {
      products = orderBy(products, ['price'], ['desc']);
    }
    if (sortBy === 'priceAsc') {
      products = orderBy(products, ['price'], ['asc']);
    }

    // FILTER PRODUCTS BY CATEGORY
    if (filters.category !== 'All') {
      products = products.filter((p) => p.category === filters.category);
    }

    // FILTER PRODUCTS BY SEARCH
    if (search !== '') {
      products = products.filter((_product) =>
        _product.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      );
    }

    // FILTER PRODUCTS BY PRICE
    if (filters.price !== 'All') {
      const minMax = filters.price ? filters.price.split('-') : '';
      products = products.filter((_product) =>
        filters.price ? _product.price >= minMax[0] && _product.price <= minMax[1] : true,
      );
    }

    return products;
  };

  const getProducts = useSelector((state) =>
    getVisibleProduct(
      state.ecommerceReducer.products,
      state.ecommerceReducer.sortBy,
      state.ecommerceReducer.filters,
      state.ecommerceReducer.productSearch,
    ),
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const [, setLoading] = useState(true);

  /** عند الضغط على زر إضافة للسلة أو البطاقة */
  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setPopupOpen(true);
  };

  const handleAddToCart = (product: any, qty: number, notes: string) => {
    dispatch(addToCart({ ...product, qty, notes }));
    setCartAlert(true);
    setPopupOpen(false); // إغلاق الـ Popup تلقائيًا
    onCartUpdate(); // تحديث السلة السفلية
  };

  const handleCloseAlert = (_reason: string) => setCartAlert(false);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" pb={3}>
        <Typography variant="h5">{t('Ecommerce.products')}</Typography>
        <Box>
          <ProductSearch />
        </Box>
      </Stack>
      <Grid container spacing={3}>
        {getProducts.length > 0 ? (
          getProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={4} key={product.id} sx={{ display: 'flex' }}>
              <BlankCard className="hoverCard" sx={{ flex: 1, cursor: 'pointer', position: 'relative' }}>
                {/* لا تفتح صفحة التفاصيل - فقط افتح البوب اب */}
                <Box
                  onClick={() => handleProductClick(product)}
                  sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  <img src={product.photo} alt={product.title} width="100%" />
                  <Typography variant="h6" fontWeight={700}>{product.title}</Typography>
                  <Typography sx={{ mt: 1, color: '#5d87ff' }}>{product.price} {t('Ecommerce.currency')}</Typography>
                </Box>
                <Tooltip title={t('Ecommerce.addToCart')}>
                  <Fab
                    size="small"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                    sx={{ position: 'absolute', bottom: 16, right: 16 }}
                  >
                    <IconBasket size="16" />
                  </Fab>
                </Tooltip>
              </BlankCard>
            </Grid>
          ))
        ) : (
          // empty state
          <Grid item xs={12}>
            <Box textAlign="center" mt={6}>
              <Typography variant="h2">{t('Ecommerce.noProducts')}</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
      <AlertCart handleClose={handleCloseAlert} openCartAlert={cartAlert} />

      {/* بوب اب المنتج */}
      {selectedProduct && (
        <ProductPopup
          open={popupOpen}
          onClose={() => setPopupOpen(false)}
          product={selectedProduct}
          onAddToCart={handleAddToCart}
        />
      )}
    </Box>
  );
};

export default ProductList;
