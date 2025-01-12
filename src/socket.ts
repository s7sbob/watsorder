// src/socket.ts
import { io } from 'socket.io-client';

// استبدل 'http://localhost:5000' بالعنوان والمنفذ الصحيحين لخادمك
const socket = io('http://localhost:5000'); 

export default socket;
