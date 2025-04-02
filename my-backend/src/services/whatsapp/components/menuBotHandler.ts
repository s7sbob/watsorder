import { Client, Message } from 'whatsapp-web.js';
import * as sql from 'mssql';
import { handleNewOrder } from './menuBot/newOrderHandler';
import { handleShowCategories } from './menuBot/showCategoriesHandler';
import { handleCategory } from './menuBot/categoryHandler';
import { handleProduct } from './menuBot/productHandler';
import { handleRemoveProduct } from './menuBot/removeProductHandler';
import { handleViewCart } from './menuBot/viewCartHandler';
import { handleCartConfirm } from './menuBot/cartConfirmHandler';
import { handleOrderStages } from './menuBot/orderStagesHandler';

interface MenuBotHandlerParams {
  client: Client;
  msg: Message;
  text: string;
  upperText: string;
  pool: any;
  sessionId: number;
  customerPhone: string;
  phoneNumber: string;
  alternateWhatsAppNumber?: string;
}

export const handleMenuBot = async ({
  client,
  msg,
  text,
  upperText,
  pool,
  sessionId,
  customerPhone,
  phoneNumber,
  alternateWhatsAppNumber
}: MenuBotHandlerParams): Promise<boolean> => {
  if (upperText === 'NEWORDER') {
    const handled = await handleNewOrder({ client, msg, pool, sessionId, customerPhone, phoneNumber });
    if (handled) return true;
  } else if (upperText === 'SHOWCATEGORIES') {
    const handled = await handleShowCategories({ client, msg, pool, sessionId, customerPhone, phoneNumber });
    if (handled) return true;
  } else if (upperText.startsWith('CATEGORY_')) {
    const handled = await handleCategory({ client, msg, pool, sessionId, upperText, phoneNumber });
    if (handled) return true;
  } else if (upperText.startsWith('PRODUCT_')) {
    const handled = await handleProduct({ client, msg, pool, sessionId, customerPhone, upperText, phoneNumber });
    if (handled) return true;
  } else if (upperText.startsWith('REMOVEPRODUCT_')) {
    const handled = await handleRemoveProduct({ client, msg, pool, sessionId, customerPhone, upperText, phoneNumber });
    if (handled) return true;
  } else if (upperText === 'VIEWCART') {
    const handled = await handleViewCart({ client, msg, pool, sessionId, customerPhone, phoneNumber });
    if (handled) return true;
  } else if (upperText === 'CARTCONFIRM') {
    const handled = await handleCartConfirm({ client, msg, pool, sessionId, customerPhone, phoneNumber });
    if (handled) return true;
  } else {
    // معالجة المراحل المتبقية للطلب مع تمرير الرقم البديل
    const handled = await handleOrderStages({
      client,
      msg,
      pool,
      sessionId,
      customerPhone,
      upperText,
      phoneNumber,
      alternateWhatsAppNumber
    });
    if (handled) return true;
  }
  return false;
};
