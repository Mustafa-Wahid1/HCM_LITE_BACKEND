// Example: routes/admin/uploads.js  (ya jahan bhi admin routes hain)

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../../public/uploads"); // adjust path
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

// POST /v1/admin/uploads/product-image
router.post("/uploads/product-image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file" });
  }

  const url = `/uploads/${req.file.filename}`;

  return res.json({
    data: { url }, // ← frontend yeh format expect karta hai
  });
});

module.exports = router;