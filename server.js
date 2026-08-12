import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./api/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Retell chat demo: http://localhost:${PORT}`);
});