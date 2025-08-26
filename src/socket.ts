import { io } from 'socket.io-client';

// استخدم withCredentials عشان تُرسل الكوكيز مع الاتصال
//  const socket = io("https://api.watsorder.com", {
const socket = io("http://localhost:5000", {
// const socket = io("http://147.189.175.71:5000", {

  
  transports: ['websocket'],
  withCredentials: true
});

export default socket;