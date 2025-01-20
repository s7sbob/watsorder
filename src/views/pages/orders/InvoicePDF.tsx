import React from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { OrderType } from 'src/types/apps/order';

// تعريف الأنماط
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 20,
    fontSize: 12,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  section: {
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: '100%',
    border: 1,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
  },
  tableCell: {
    flex: 1,
    padding: 5,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    borderTop: 1,
    paddingTop: 10,
  },
});

// مكون الفاتورة
const InvoicePDF = ({ order }: { order: OrderType }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* العنوان */}
      <View style={styles.header}>
        <Text>Invoice # {order.id}</Text>
        <Text>Date: {new Date(order.createdAt as string).toLocaleDateString()}</Text>
      </View>

      {/* تفاصيل العميل */}
      <View style={styles.section}>
        <Text>Customer Phone: {order.customerPhoneNumber}</Text>
        <Text>Delivery Address: {order.deliveryAddress}</Text>
      </View>

      {/* جدول العناصر */}
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={styles.tableCell}>Product</Text>
          <Text style={styles.tableCell}>Quantity</Text>
          <Text style={styles.tableCell}>Price</Text>
          <Text style={styles.tableCell}>Total</Text>
        </View>
        {order.items.map((item, index) => (
          <View style={styles.tableRow} key={index}>
            <Text style={styles.tableCell}>{item.productName}</Text>
            <Text style={styles.tableCell}>{item.quantity}</Text>
            <Text style={styles.tableCell}>{item.price}</Text>
            <Text style={styles.tableCell}>{item.quantity * item.price}</Text>
          </View>
        ))}
      </View>

      {/* التكلفة الإجمالية */}
      <View style={styles.footer}>
        <Text>Subtotal: {order.totalPrice}</Text>
        {order.deliveryFee !== null && <Text>Delivery Fee: {order.deliveryFee}</Text>}
        {order.serviceFee !== null && <Text>Service Fee: {order.serviceFee}</Text>}
        {order.taxValue !== null && <Text>Tax: {order.taxValue}</Text>}
        <Text>Grand Total: {order.totalPrice as number + (order.deliveryFee || 0) + (order.serviceFee || 0) + (order.taxValue || 0)}</Text>
      </View>
    </Page>
  </Document>
);