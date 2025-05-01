// src/types/multer-s3.d.ts
declare global {
    namespace Express {
      namespace MulterS3 {
        interface File extends Multer.File {
          bucket: string;
          key: string;
          acl: string;
          contentType: string;
          contentDisposition: null;
          storageClass: string;
          serverSideEncryption: null;
          metadata: any;
          location: string;
          etag: string;
        }
      }
      interface Request {
        file?: Express.MulterS3.File;
      }
    }
  }
  