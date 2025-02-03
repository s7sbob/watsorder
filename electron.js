// electron.js (ES Module)

console.log('>>> Running electron.js...')

import { app, BrowserWindow } from 'electron'
console.log('>>> Imported electron successfully')

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

console.log('>>> Before mainWindow definition...')
console.log('>>> After mainWindow definition...')



// ========= [ حل مشكلة __dirname في ESM ] =========
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ========= [ Global window reference ] =========
let mainWindow = null

// ========= [ Create the BrowserWindow function ] =========
function createWindow() {
  // هل نحن في وضع التطوير أم لا (تبعاً لمتغير NODE_ENV)
  const isDev = process.env.NODE_ENV === 'development'

  // أنشئ نافذة
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false, 
      contextIsolation: true
    }
  })

  // إذا كنا في وضع التطوير => اشبك على عنوان الـ Vite Dev Server
  // إذا كنا في الإنتاج => استخدم الملف dist/index.html
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const indexFilePath = join(__dirname, 'dist', 'index.html')
    mainWindow.loadURL(`file://${indexFilePath}`)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ========= [ Electron Ready ] =========
app.whenReady().then(() => {
  createWindow()

  // على macOS: أعِد إنشاء النافذة لو تم النقر على أيقونة التطبيق
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ========= [ Close event handling ] =========
app.on('window-all-closed', () => {
  // على macOS: تظل التطبيقات مفتوحة حتى يغلق المستخدم فعلياً
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
