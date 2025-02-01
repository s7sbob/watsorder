// src/types/apps/order.ts

import { ReactNode } from "react";

export interface OrderItemType {
    productName: string;
    quantity: number;
    price: number;
  }
  
  export interface OrderType {
    customerPhoneNumber: ReactNode;
    finalTotal: any;
    id: number;
    sessionId: number;
    customerPhone: string;
    customerName?: string; // أضف هذا الحقل
    deliveryAddress: string | null;
    totalPrice: number | null;
    prepTime?: number | null;
    deliveryFee?: number | null;
    serviceFee?: number | null;
    taxValue?: number | null;
    finalConfirmed?: boolean;
    status: string;
    createdAt?: string;
    items: OrderItemType[];  // تأكد من وجود هذا السطر
  }
  