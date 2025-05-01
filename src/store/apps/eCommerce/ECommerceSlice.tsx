import axios from '../../../utils/axios';
import { filter, map } from 'lodash';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from 'src/store/Store';

interface StateType {
  products: any[];
  productSearch: string;
  sortBy: string;
  cart: any[];
  total: number;
  storeInfo: {
    name: string;
    about: string;
    logo: string;
  };
  categories: string[];
  filters: {
    category: string;
    price: string;
  };
  error: string;
}




const initialState = {
  products: [],
  productSearch: '',
  sortBy: 'newest',
  cart: [],
  total: 0,
  storeInfo: {
    name: '',
    about: '',
    logo: ''
  },
  categories: [],
  filters: {
    category: 'All',
    price: 'All',
  },
  error: '',
};

export const EcommerceSlice = createSlice({
  name: 'ecommerce',
  initialState,
  reducers: {
    // HAS ERROR
    hasError(state: StateType, action) {
      state.error = action.payload;
    },

    // GET PRODUCTS
    getProducts: (state, action) => {
      state.products = action.payload.map((product: {
        description: any;
        category: any; id: any; name: any; price: any; photo: any; 
}) => ({
        id: product.id,
        title: product.name,
        price: product.price,
        photo: product.photo,
        category: product.category,   // ✅
        description: product.description, // أضف الحقل هنا

        qty: 1, // كمية افتراضية
      }));
    },

    // GET STORE INFO
    getStoreInfo: (state, action) => {
      state.storeInfo = action.payload;
    },

    // GET CATEGORIES
    getCategories: (state, action) => {
      state.categories = action.payload;
    },

    SearchProduct: (state, action) => {
      state.productSearch = action.payload;
    },

    //  SORT  PRODUCTS
    sortByProducts(state, action) {
      state.sortBy = action.payload;
    },

    //  SORT  By Price
    sortByPrice(state, action) {
      state.filters.price = action.payload.price;
    },

    //  FILTER PRODUCTS
    filterProducts(state, action) {
      state.filters.category = action.payload.category;
    },

    //  FILTER Reset
    filterReset(state) {
      state.filters.category = 'All';
      state.filters.price = 'All';
      state.sortBy = 'newest';
    },

    // ADD TO CART
    addToCart(state: StateType, action) {
      const product = action.payload;
      state.cart = [...state.cart, product];
    },

    // qty increment
    increment(state: StateType, action) {
      const productId = action.payload;
      const updateCart = map(state.cart, (product) => {
        if (product.id === productId) {
          return {
            ...product,
            qty: product.qty + 1,
          };
        }

        return product;
      });

      state.cart = updateCart;
    },

    // qty decrement
    decrement(state: StateType, action) {
      const productId = action.payload;
      const updateCart = map(state.cart, (product) => {
        if (product.id === productId) {
          return {
            ...product,
            qty: product.qty - 1,
          };
        }

        return product;
      });

      state.cart = updateCart;
    },

    // delete Cart
    deleteCart(state: StateType, action) {
      const updateCart = filter(state.cart, (item) => item.id !== action.payload);
      state.cart = updateCart;
    },
  },
});

export const {
  hasError,
  getProducts,
  getStoreInfo,
  getCategories,
  SearchProduct,
  sortByProducts,
  filterProducts,
  increment,
  deleteCart,
  decrement,
  addToCart,
  sortByPrice,
  filterReset,
} = EcommerceSlice.actions;

export const fetchStoreData = (storeName: string) => async (dispatch: AppDispatch) => {
  try {
    // جلب معلومات المتجر
    const storeResponse = await axios.get(`/api/public/ecommerce/${storeName}`);
    dispatch(getStoreInfo(storeResponse.data));
    
    // جلب الفئات
    const categoriesResponse = await axios.get(`/api/public/ecommerce/${storeName}/categories`);
    dispatch(getCategories(categoriesResponse.data));
    
    // جلب المنتجات
    const productsResponse = await axios.get(`/api/public/ecommerce/${storeName}/products`);
    dispatch(getProducts(productsResponse.data));
  } catch (error) {
    dispatch(hasError(error));
  }
};

export default EcommerceSlice.reducer;
