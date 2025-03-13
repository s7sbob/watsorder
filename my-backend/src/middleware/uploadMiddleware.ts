// upload.ts
import multer from 'multer'
import path from 'path'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // المجلد الثابت لحفظ الصور
    cb(null, 'keywords-images')
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

export const upload = multer({ storage })
