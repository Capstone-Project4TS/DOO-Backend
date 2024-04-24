// multerConfig.js
import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify upload directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use original filename
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

export default upload;
