import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Op } from "sequelize";

import { Image } from "../models/image.js";
import { Gallery } from "../models/gallery.js";
import { User } from "../models/user.js";
import { validateInput } from "../utils/validate-inputs.js";
import { isAuth } from "../middleware/auth.js";

export const imagesRouter = express.Router({ mergeParams: true });

// Set up multer for file upload
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, callback) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    if (mimetype && extname) {
      return callback(null, true);
    }
    callback(new Error("Only image files (.jpeg, .jpg, .png) are allowed!"));
  },
});

// POST /api/galleries/:galleryId/images - Add an image to a gallery
imagesRouter.post(
  "/",
  isAuth({ required: true }),
  upload.single("file"),
  async (req, res) => {
    // Input validations
    const schema = [
      { name: "title", required: true, type: "string", location: "body" },
      { name: "file", required: true, type: "file", location: "file" },
    ];
    if (!validateInput(req, res, schema)) return;

    try {
      const galleryId = req.params.galleryId;
      if (!galleryId) {
        return res.status(400).json({ error: "Gallery ID is required " });
      }

      // Check if gallery exists
      const gallery = await Gallery.findByPk(galleryId);
      if (!gallery) {
        return res
          .status(404)
          .json({ error: `Gallery(id=${galleryId}) not found` });
      }

      // Check if user is authenticated to post image to the gallery
      if (req.user.id !== gallery.UserId) {
        return res.status(403).json({
          error: "You don't have permission to add images to this gallery",
        });
      }

      if (!req.file) {
        return res.status(422).json({ error: "No image file provided" });
      }

      if (!req.body.title) {
        return res.status(422).json({ error: "Title is required" });
      }

      const newImage = await Image.create({
        title: req.body.title,
        file: req.file,
        UserId: req.user.id, // Get user ID from authenticated request
        GalleryId: galleryId, // Associate with the gallery
      });

      res.status(201).json({
        id: newImage.id,
        title: newImage.title,
        date: newImage.createdAt,
        author: req.user.username,
        userId: req.user.id,
        galleryId: newImage.GalleryId,
        imageUrl: `/api/galleries/${galleryId}/images/${newImage.id}`,
      });
    } catch (err) {
      console.error("Error adding image:", err);
      if (err.name === "SequelizeValidationError") {
        return res.status(422).json({ error: err.message });
      } else if (err.name === "SequelizeUniqueConstraintError") {
        return res
          .status(409)
          .json({ error: "An image with this title already exists" });
      }
      res
        .status(500)
        .json({ error: "Internal server error while adding image" });
    }
  },
);

// GET /api/galleries/:galleryId/images - Get all images in a gallery
imagesRouter.get("/", isAuth({ required: false }), async (req, res) => {
  try {
    const galleryId = req.params.galleryId;

    if (!galleryId) {
      return res.status(400).json({
        error: "Gallery ID is required",
        code: "MISSING_GALLERY_ID",
      });
    }

    // Check if the gallery exists
    const gallery = await Gallery.findByPk(galleryId, {
      include: [
        {
          model: User,
          attributes: ["id", "username"],
        },
      ],
    });

    if (!gallery) {
      return res.status(404).json({
        error: `Gallery(id=${galleryId}) not found.`,
        code: "RESOURCE_NOT_FOUND",
      });
    }

    // Cursor-based pagination
    const { limit = 10, cursor } = req.query;
    const parsedLimit = parseInt(limit);

    // Validate pagination parameters
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error:
          "Invalid limit parameter. Limit must be a positive integer between 1 and 100.",
      });
    }

    let query = {
      where: { GalleryId: galleryId },
      order: [["createdAt", "DESC"]],
      limit: parsedLimit + 1, // Get one extra to determine if there are more results
      include: [
        {
          model: User,
          attributes: ["username"],
        },
      ],
    };

    // If cursor is provided, use it for pagination
    if (cursor) {
      try {
        // Validate cursor is a valid timestamp
        const cursorDate = new Date(parseInt(cursor));
        if (isNaN(cursorDate.getTime())) {
          throw new Error("Invalid cursor timestamp");
        }

        query.where = {
          ...query.where,
          createdAt: {
            [Op.lt]: cursorDate,
          },
        };
      } catch (error) {
        return res.status(400).json({
          error: "Invalid cursor format. Expected timestamp.",
        });
      }
    }

    const images = await Image.findAll(query);

    // Determine if there are more results
    const hasMore = images.length > parsedLimit;
    // Remove the extra result
    if (hasMore) {
      images.pop();
    }

    // Get the next cursor
    const nextCursor =
      hasMore && images.length > 0
        ? images[images.length - 1].createdAt.getTime()
        : null;

    // Map images to include necessary information
    const mappedImages = images.map((image) => {
      const imageData = image.toJSON();
      return {
        id: imageData.id,
        title: imageData.title,
        author: imageData.User ? imageData.User.username : "Unknown",
        createdAt: imageData.createdAt,
        imageUrl: `/api/galleries/${galleryId}/images/${imageData.id}`,
        userId: imageData.UserId,
        galleryId: imageData.GalleryId,
      };
    });

    return res.json({
      images: mappedImages,
      nextCursor: nextCursor,
    });
  } catch (err) {
    console.error("Error retrieving images:", err);
    res.status(500).json({
      error: "Internal server error while retrieving images",
      code: "SERVER_ERROR",
    });
  }
});

// GET /api/galleries/:galleryId/images/:id - Get a specific image by ID
imagesRouter.get("/:id", isAuth({ required: false }), async (req, res) => {
  try {
    const galleryId = req.params.galleryId;
    const imageId = req.params.id;
    const userId = req.user?.id; // Get user ID from authenticated request (if available)

    if (!galleryId) {
      return res.status(400).json({
        error: "Gallery ID is required",
        code: "MISSING_GALLERY_ID",
      });
    }

    // Validate ID is a valid number (if using numeric IDs)
    if (isNaN(parseInt(imageId))) {
      return res.status(400).json({
        error: "Invalid image ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    // Check if the gallery exists and get owner information
    const gallery = await Gallery.findByPk(galleryId, {
      attributes: ["id", "UserId"],
    });

    if (!gallery) {
      return res.status(404).json({
        error: `Gallery(id=${galleryId}) not found.`,
        code: "RESOURCE_NOT_FOUND",
      });
    }

    // Find the image with the matching gallery ID
    const image = await Image.findOne({
      where: {
        id: imageId,
        GalleryId: galleryId,
      },
      include: [
        {
          model: User,
          attributes: ["username"],
        },
      ],
    });

    if (!image) {
      return res.status(404).json({
        error: `Image(id=${imageId}) not found in gallery(id=${galleryId}).`,
        code: "RESOURCE_NOT_FOUND",
      });
    }

    // Check if the file exists on the server
    const filePath = path.join("uploads", image.file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "Image file not found on server",
        code: "FILE_NOT_FOUND",
      });
    }

    // Set the content type and send the file
    res.setHeader("Content-Type", image.file.mimetype);
    res.sendFile(filePath, { root: path.resolve() });
  } catch (err) {
    console.error("Error retrieving image:", err);
    res.status(500).json({
      error: "Internal server error while retrieving image",
      code: "SERVER_ERROR",
    });
  }
});

// DELETE /api/galleries/:galleryId/images/:id - Delete a specific image by ID
imagesRouter.delete("/:id", isAuth({ required: true }), async (req, res) => {
  try {
    const galleryId = req.params.galleryId;
    const imageId = req.params.id;

    if (!galleryId) {
      return res.status(400).json({
        error: "Gallery ID is required",
        code: "MISSING_GALLERY_ID",
      });
    }

    // Validate ID is a valid number (if using numeric IDs)
    if (isNaN(parseInt(imageId))) {
      return res.status(400).json({
        error: "Invalid image ID format",
        code: "INVALID_ID_FORMAT",
      });
    }

    // Find the gallery first to check ownership
    const gallery = await Gallery.findByPk(galleryId);
    if (!gallery) {
      return res.status(404).json({
        error: `Gallery(id=${galleryId}) not found.`,
        code: "RESOURCE_NOT_FOUND",
      });
    }

    // Check if the user is the owner of the gallery
    if (gallery.UserId !== req.user.id) {
      return res.status(403).json({
        error: "You don't have permission to delete images from this gallery",
        code: "PERMISSION_DENIED",
      });
    }

    // Find the image in this gallery
    const image = await Image.findOne({
      where: {
        id: imageId,
        GalleryId: galleryId,
      },
    });

    if (!image) {
      return res.status(404).json({
        error: `Image(id=${imageId}) not found in gallery(id=${galleryId}).`,
        code: "RESOURCE_NOT_FOUND",
      });
    }

    // Delete the file from the uploads directory
    if (image.file && image.file.filename) {
      const filePath = path.join("uploads", image.file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fsError) {
          console.error("Error deleting file:", fsError);
          // Continue with deleting the database record even if file deletion fails
        }
      } else {
        console.warn(`File ${filePath} not found when attempting to delete`);
      }
    }

    await image.destroy();

    // Respond with status 204 No Content instead of returning content
    // This is more RESTful for successful deletion operations
    return res.status(204).send();
  } catch (err) {
    console.error("Error deleting image:", err);

    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        error:
          "Cannot delete this image because it has associated comments or other dependencies",
        code: "CONSTRAINT_ERROR",
      });
    }

    res.status(500).json({
      error: "Internal server error while deleting image",
      code: "SERVER_ERROR",
    });
  }
});
