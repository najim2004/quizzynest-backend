import multer from "multer";
import path from "path";

// Multer স্টোরেজ কনফিগারেশন
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // সাময়িকভাবে ফাইল সেভ করার লোকেশন
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "icon-" + uniqueSuffix + ext);
  },
});

// ফাইল ফিল্টার - শুধুমাত্র ইমেজ অনুমতি দিবে
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG and SVG are allowed."),
      false
    );
  }
};

// Multer ইনস্ট্যান্স তৈরি
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB লিমিট
  },
});
