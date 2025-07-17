import express from "express";
import bodyParser from "body-parser";
import { sequelize } from "./datasource.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { authRouter } from "./routers/auth_router.js";
import { galleryRouter } from "./routers/gallery_router.js";
import { imagesRouter } from "./routers/images_router.js";
import { commentsRouter } from "./routers/comments_router.js";

const PORT = 3000;
export const app = express();
// CORS??

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Log incoming requests
app.use(function (req, res, next) {
  console.log("HTTP request", req.method, req.url, req.body);
  next();
});

// Serve static files
app.use(express.static("static"));
app.use("/uploads", express.static("uploads"));

try {
  await sequelize.authenticate();
  await sequelize.sync({ alter: { drop: false } });
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

app.use("/api/auth", authRouter);
app.use("/api/galleries", galleryRouter);
app.use("/api/galleries/:galleryId/images", imagesRouter); // Mount imagesRouter at the nested path
app.use("/api/comments", commentsRouter);

app.all("/{*any}", (req, res, next) => {});

app.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://0.0.0.0:%s", PORT);
});
