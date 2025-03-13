// src/socket.ts
import { io } from 'socket.io-client';

const socket = io('https://api.watsorder.com');

export default socket;
