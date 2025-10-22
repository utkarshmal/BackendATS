// ATS resume/backend/index.js

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv"); // CJS require

dotenv.config(); 

const { uploadResume } = require("./controllers/atsController.js"); 

// Storage config

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("resume"), uploadResume);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));