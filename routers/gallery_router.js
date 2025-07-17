import express from "express";
import { Op } from "sequelize";

import { Gallery } from "../models/gallery.js";
import { User } from "../models/user.js";
import { Image } from "../models/image.js";
import { isAuth } from "../middleware/auth.js";

export const galleryRouter = express.Router();

// Create a new gallery
galleryRouter.post("/", isAuth({ required: true }), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to create a gallery" });
    }

    if (!name) {
      return res.status(422).json({ error: "Gallery name is required" });
    }

    const newGallery = await Gallery.create({
      UserId: userId,
      name,
    });

    res.status(201).json({
      id: newGallery.id,
      name: newGallery.name,
      userId: newGallery.UserId,
      createdAt: newGallery.createdAt,
      updatedAt: newGallery.updatedAt,
    });
  } catch (error) {
    console.error("Error creating gallery:", error);
    return res.status(500).json({ error: "Gallery creation failed" });
  }
});

// Get all galleries (cursor-based pagination)
galleryRouter.get("/", isAuth({ required: false }), async (req, res) => {
  try {
    // Cursor-based pagination
    const { limit = 10, cursor } = req.query;
    const parsedLimit = parseInt(limit);
    const userId = req.user?.id; // Get user ID from authenticated request (if available)

    // Validate pagination parameters
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    let query = {
      order: [["createdAt", "DESC"]],
      limit: parsedLimit + 1, // Get one extra to determine if there are more results
      include: [
        {
          model: User,
          attributes: ["id", "username"],
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

    const galleries = await Gallery.findAll(query);

    // Get the latest image and image count for each gallery
    const mappedGalleries = await Promise.all(
      galleries.map(async (gallery) => {
        const latestImage = await Image.findOne({
          where: { GalleryId: gallery.id },
          order: [["createdAt", "DESC"]],
          attributes: ["id", "title", "file", "createdAt"],
        });
        const imageCount = await Image.count({
          where: { GalleryId: gallery.id },
        });
        return {
          id: gallery.id,
          name: gallery.name,
          userId: gallery.UserId,
          createdAt: gallery.createdAt,
          updatedAt: gallery.updatedAt,
          owner: gallery.User ? gallery.User.username : "Unknown",
          isOwner: userId && gallery.UserId === userId,
          coverImage: latestImage
            ? {
                id: latestImage.id,
                title: latestImage.title,
                file: latestImage.file,
                url: `/uploads/${latestImage.file.filename}`,
              }
            : null,
          imageCount: imageCount,
        };
      }),
    );

    // Determine if there are more results
    const hasMore = mappedGalleries.length > parsedLimit;
    // Remove the extra result
    if (hasMore) {
      mappedGalleries.pop();
    }

    // Get the next cursor
    const nextCursor =
      hasMore && mappedGalleries.length > 0
        ? mappedGalleries[mappedGalleries.length - 1].createdAt.getTime()
        : null;

    // Get the total number of galleries
    const totalGalleries = await Gallery.count();

    res.status(200).json({
      galleries: mappedGalleries,
      nextCursor,
      total: totalGalleries, // Optionally, you can count total if needed
    });
  } catch (error) {
    console.error("Error fetching galleries:", error);
    return res
      .status(500)
      .json({ error: "Internal server error while fetching galleries" });
  }
});

// Get a specific gallery by ID
galleryRouter.get("/:id", isAuth({ required: false }), async (req, res) => {
  try {
    const galleryId = parseInt(req.params.id);
    const userId = req.user?.id; // Get user ID from authenticated request (if available)

    if (isNaN(galleryId)) {
      return res.status(400).json({ error: "Invalid gallery ID format" });
    }

    const gallery = await Gallery.findByPk(galleryId, {
      include: [
        {
          model: User,
          attributes: ["id", "username"],
        },
      ],
    });

    if (!gallery) {
      return res.status(404).json({ error: "Gallery not found" });
    }

    // Get the latest image for this gallery
    const latestImage = await Image.findOne({
      where: { GalleryId: gallery.id },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "title", "file", "createdAt"],
    });

    // Get the total image count for this gallery
    const imageCount = await Image.count({
      where: { GalleryId: gallery.id },
    });

    res.status(200).json({
      id: gallery.id,
      name: gallery.name,
      userId: gallery.UserId,
      owner: gallery.User ? gallery.User.username : "Unknown",
      createdAt: gallery.createdAt,
      updatedAt: gallery.updatedAt,
      isOwner: userId && gallery.UserId === userId,
      coverImage: latestImage
        ? {
            id: latestImage.id,
            title: latestImage.title,
            file: latestImage.file,
            url: `/uploads/${latestImage.file.filename}`,
          }
        : null,
      imageCount: imageCount,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(422).json({ error: error.message });
    } else {
      return res
        .status(500)
        .json({ error: "Internal server error while fetching gallery" });
    }
  }
});

// galleryRouter.patch("/:id", isAuth({ required: true }), async (req, res) => {
//   try {
//     const galleryId = parseInt(req.params.id);
//     if (isNaN(galleryId)) {
//       return res.status(400).json({ error: "Invalid gallery ID format" });
//     }
//     const gallery = await Gallery.findByPk(galleryId, {
//       include: [{
//         model: User,
//         attributes: ['id', 'username']
//       }]
//     });

//     if (!gallery) {
//       return res.status(404).json({ error: "Gallery not found" });
//     }

//     if (req.user.id !== gallery.UserId) {
//       return res.status(403).json({ error: "You do not have permission to update this gallery" });
//     }

//     const { name, description } = req.body;
//     const updatedGallery = await gallery.update({
//       name: name || gallery.name,
//       description: description || gallery.description,
//     });

//     // Send the updated gallery back to the client
//     res.status(200).json({
//       id: updatedGallery.id,
//       name: updatedGallery.name,
//       description: updatedGallery.description,
//       userId: updatedGallery.UserId,
//       createdAt: updatedGallery.createdAt,
//     });

//   } catch (error) {
//     console.error("Error updating gallery:", error);
//     if (error.name === "SequelizeValidationError") {
//       return res.status(422).json({ error: error.message });
//     } else {
//       return res.status(500).json({ error: "Internal server error while updating gallery" });
//     }
//   };
// });

galleryRouter.delete("/:id", isAuth({ required: true }), async (req, res) => {
  try {
    const galleryId = parseInt(req.params.id);
    if (isNaN(galleryId)) {
      return res.status(400).json({ error: "Invalid gallery ID format" });
    }

    const gallery = await Gallery.findByPk(galleryId, {
      include: [
        {
          model: User,
          attributes: ["id", "username"],
        },
      ],
    });

    if (!gallery) {
      return res.status(404).json({ error: "Gallery not found" });
    }

    if (req.user.id !== gallery.UserId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this gallery" });
    }

    await gallery.destroy();
    return res.status(204).send("");
  } catch (error) {
    console.error("Error deleting gallery:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(422).json({ error: error.message });
    } else {
      return res
        .status(500)
        .json({ error: "Internal server error while deleting gallery" });
    }
  }
});
