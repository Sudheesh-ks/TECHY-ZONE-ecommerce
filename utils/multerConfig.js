const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  }
});


const upload = multer({
   storage: storage,
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 
   fileFilter: (req, file, cb) => {
     const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
     if (allowedTypes.includes(file.mimetype)) {
       cb(null, true);
     } else {
       cb(new Error('Invalid file type'), false);
     }
   }

});

module.exports = upload;