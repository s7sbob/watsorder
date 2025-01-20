// src/store/Store.ts
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';

import CustomizerReducer from './customizer/CustomizerSlice';
import EcommerceReducer from './apps/eCommerce/ECommerceSlice';
import ChatsReducer from './apps/chat/ChatSlice';
import NotesReducer from './apps/notes/NotesSlice';
import EmailReducer from './apps/email/EmailSlice';
import TicketReducer from './apps/tickets/TicketSlice';
import ContactsReducer from './apps/contacts/ContactSlice';
import UserProfileReducer from './apps/userProfile/UserProfileSlice';
import BlogReducer from './apps/blog/BlogSlice';
import authReducer from './auth/AuthSlice';
import sessionReducer from './apps/sessions/SessionSlice';

// استيراد orderReducer
import orderReducer from './apps/orders/OrderSlice';

export const store = configureStore({
  reducer: {
    customizer: CustomizerReducer,
    ecommerceReducer: EcommerceReducer,
    chatReducer: ChatsReducer,
    emailReducer: EmailReducer,
    notesReducer: NotesReducer,
    contactsReducer: ContactsReducer,
    ticketReducer: TicketReducer,
    userpostsReducer: UserProfileReducer,
    blogReducer: BlogReducer,
    auth: authReducer,
    sessionReducer,
    order: orderReducer, // إضافة orderReducer
  },
});

const rootReducer = combineReducers({
  customizer: CustomizerReducer,
  ecommerceReducer: EcommerceReducer,
  chatReducer: ChatsReducer,
  emailReducer: EmailReducer,
  notesReducer: NotesReducer,
  contactsReducer: ContactsReducer,
  ticketReducer: TicketReducer,
  userpostsReducer: UserProfileReducer,
  blogReducer: BlogReducer,
  auth: authReducer,
  sessionReducer,
  order: orderReducer, // إضافة orderReducer هنا أيضاً
});

export type AppState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useDispatch = () => useAppDispatch<AppDispatch>();
export const useSelector: TypedUseSelectorHook<AppState> = useAppSelector;

export default store;
