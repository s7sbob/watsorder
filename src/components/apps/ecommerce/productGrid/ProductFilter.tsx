// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useDispatch, useSelector } from 'src/store/Store';
import {
  ListItemText,
  ListItemButton,
  List,
  Divider,
  FormGroup,
  ListItemIcon,
  FormControlLabel,
  Radio,
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  sortByProducts,
  sortByPrice,
  filterReset,
} from 'src/store/apps/eCommerce/ECommerceSlice';
import {
  IconSortAscending2,
  IconSortDescending2,
  IconAd2,
} from '@tabler/icons-react';

const ProductFilter = () => {
  const dispatch = useDispatch();
  const active = useSelector((state) => state.ecommerceReducer.filters);
  const checkactive = useSelector((state) => state.ecommerceReducer.sortBy);
  const customizer = useSelector((state) => state.customizer);
  const br = `${customizer.borderRadius}px`;



  const filterbySort = [
    { id: 1, value: 'newest', label: 'الأحدث', icon: IconAd2 },
    { id: 2, value: 'priceDesc', label: 'السعر: من الأعلى إلى الأقل', icon: IconSortAscending2 },
    { id: 3, value: 'priceAsc', label: 'السعر: من الأقل إلى الأعلى', icon: IconSortDescending2 },
  ];
  
  const filterbyPrice = [
    {
      id: 0,
      label: 'الكل',
      value: 'All',
    },
    {
      id: 1,
      label: '0-50',
      value: '0-50',
    },
    {
      id: 3,
      label: '50-100',
      value: '50-100',
    },
    {
      id: 4,
      label: '100-200',
      value: '100-200',
    },
    {
      id: 5,
      label: 'أكثر من 200',
      value: '200-99999',
    },
  ];

  const handlerPriceFilter = (value: React.ChangeEvent<HTMLInputElement>) => {
    if (value.target.checked) {
      dispatch(sortByPrice({ price: value.target.value }));
    }
  };

  return (
    <>
      <List>
        {/* ------------------------------------------- */}
        {/* Category filter */}
        {/* ------------------------------------------- */}

        {/* ------------------------------------------- */}
        {/* Sort by */}
        {/* ------------------------------------------- */}
        <Typography variant="subtitle2" fontWeight={600} px={3} mt={3} pb={2}>
          ترتيب حسب
        </Typography>
        {filterbySort.map((filter) => {
          return (
            <ListItemButton
              sx={{ mb: 1, mx: 3, borderRadius: br }}
              selected={checkactive === `${filter.value}`}
              onClick={() => dispatch(sortByProducts(`${filter.value}`))}
              key={filter.id + filter.label + filter.value}
            >
              <ListItemIcon sx={{ minWidth: '30px' }}>
                <filter.icon stroke="1.5" size={19} />
              </ListItemIcon>
              <ListItemText>{filter.label}</ListItemText>
            </ListItemButton>
          );
        })}
        <Divider></Divider>
        {/* ------------------------------------------- */}
        {/* Filter By Pricing */}
        {/* ------------------------------------------- */}
        <Typography variant="h6" px={3} mt={3} pb={2}>
          حسب السعر
        </Typography>
        <Box p={3} pt={0}>
          <FormGroup>
            {filterbyPrice.map((price) => (
              <FormControlLabel
                key={price.label}
                control={
                  <Radio
                    value={price.value}
                    checked={active.price === price.value}
                    onChange={handlerPriceFilter}
                  />
                }
                label={price.label}
              />
            ))}
          </FormGroup>
        </Box>
        <Divider></Divider>
        {/* ------------------------------------------- */}
        {/* Reset */}
        {/* ------------------------------------------- */}
        <Box p={3}>
          <Button variant="contained" onClick={() => dispatch(filterReset())} fullWidth>
            إعادة ضبط الفلاتر
          </Button>
        </Box>
      </List>
    </>
  );
};

export default ProductFilter;
