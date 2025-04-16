import { createSlice } from '@reduxjs/toolkit';
import { getCookie, setCookie } from 'src/utils/cookieHelpers';

interface StateType {
  activeDir?: string;
  activeMode?: string; // light or dark
  activeTheme?: string; // BLUE_THEME, GREEN_THEME, BLACK_THEME, PURPLE_THEME, ORANGE_THEME
  SidebarWidth?: number;
  MiniSidebarWidth?: number;
  TopbarHeight?: number;
  isCollapse?: boolean;
  isLayout?: string;
  isSidebarHover?: boolean;
  isMobileSidebar?: boolean;
  isHorizontal?: boolean;
  isLanguage?: string;
  isCardShadow?: boolean;
  borderRadius?: number;
}

// قراءة قيمة اللغة من الكوكيز أو استخدام القيمة الافتراضية "ar"
const initialLang = getCookie('language') || 'ar';
// تحديد الاتجاه بناءً على اللغة (إذا كانت "ar" يكون "rtl" وإلا "ltr")
const initialDir = initialLang === 'ar' ? 'rtl' : 'ltr';

const initialState: StateType = {
  activeDir: initialDir,
  activeMode: 'light',
  activeTheme: 'BLUE_THEME',
  SidebarWidth: 270,
  MiniSidebarWidth: 87,
  TopbarHeight: 70,
  isLayout: 'boxed',
  isCollapse: false,
  isSidebarHover: false,
  isMobileSidebar: false,
  isHorizontal: false,
  isLanguage: initialLang,
  isCardShadow: true,
  borderRadius: 7,
};

export const CustomizerSlice = createSlice({
  name: 'customizer',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.activeTheme = action.payload;
    },
    setDarkMode: (state, action) => {
      state.activeMode = action.payload;
    },
    setDir: (state, action) => {
      state.activeDir = action.payload;
      // يمكن تخزين الاتجاه أيضًا في الكوكيز إذا احتجت
      setCookie('dir', action.payload, 30);
    },
    setLanguage: (state, action) => {
      state.isLanguage = action.payload;
      if (action.payload === 'ar') {
        state.activeDir = 'rtl';
      } else {
        state.activeDir = 'ltr';
      }
      // حفظ اللغة والاتجاه في الكوكيز لمدة 30 يوم
      setCookie('language', action.payload, 30);
      setCookie('dir', state.activeDir, 30);
    },
    setCardShadow: (state, action) => {
      state.isCardShadow = action.payload;
    },
    toggleSidebar: (state) => {
      state.isCollapse = !state.isCollapse;
    },
    hoverSidebar: (state, action) => {
      state.isSidebarHover = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebar = !state.isMobileSidebar;
    },
    toggleLayout: (state, action) => {
      state.isLayout = action.payload;
    },
    toggleHorizontal: (state, action) => {
      state.isHorizontal = action.payload;
    },
    setBorderRadius: (state, action) => {
      state.borderRadius = action.payload;
    },
  },
});

export const {
  setTheme,
  setDarkMode,
  setDir,
  toggleSidebar,
  hoverSidebar,
  toggleMobileSidebar,
  toggleLayout,
  setBorderRadius,
  toggleHorizontal,
  setLanguage,
  setCardShadow,
} = CustomizerSlice.actions;

export default CustomizerSlice.reducer;
