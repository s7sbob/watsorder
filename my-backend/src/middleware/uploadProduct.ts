// src/middleware/uploadMiddleware.ts
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_S3_BUCKET || 'watsorder-images';

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucket,
    key: function (req, file, cb) {
      cb(null, `keywords-images/${Date.now()}-${Math.floor(Math.random() * 1000)}-${file.originalname}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // حد الحجم 5 ميجابايت
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image file!'));
    }
  },
});

export default upload;
