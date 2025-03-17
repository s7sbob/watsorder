// src/types/apps/order.ts

export interface OrderItemType {
  productName: string
  quantity: number
  price: number
}

export interface OrderType {
  id: number
  sessionId: number
  customerPhone: string         // ← عدّلنا التسمية هنا لتكون customerPhone
  customerName?: string
  deliveryAddress: string | null
  totalPrice: number | null
  prepTime?: number | null
  deliveryFee?: number | null
  serviceFee?: number | null
  taxValue?: number | null
  finalConfirmed?: boolean
  status: string
  createdAt?: string
  items: OrderItemType[]
}
