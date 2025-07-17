import express from "express";
import { Comment } from "../models/comment.js";
import { Image } from "../models/image.js";
import { User } from "../models/user.js";
import { Gallery } from "../models/gallery.js";
import { isAuth } from "../middleware/auth.js";

export const commentsRouter = express.Router();

// POST /api/comments/:imageId - Add a comment to an image
commentsRouter.post(
  "/:imageId",
  isAuth({ required: true }),
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const { content } = req.body;
      const userId = req.user?.id; // Get user ID from authenticated request

      if (!userId) {
        return res
          .status(401)
          .json({ error: "Authentication required to add comments" });
      }

      if (!content) {
        return res.status(422).json({ error: "Comment content is required" });
      }

      // Check if image exists
      const image = await Image.findByPk(imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      const newComment = await Comment.create({
        UserId: userId,
        content,
        ImageId: imageId,
      });

      res.status(201).json({
        id: newComment.id,
        imageId: newComment.ImageId,
        userId: newComment.UserId,
        content: newComment.content,
        createdAt: newComment.createdAt,
      });
    } catch (err) {
      console.error("Error adding comment:", err);
      if (err.name === "SequelizeValidationError") {
        return res.status(422).json({ error: err.message });
      } else if (err.name === "SequelizeUniqueConstraintError") {
        return res
          .status(409)
          .json({ error: "A comment with these attributes already exists" });
      }
      res
        .status(500)
        .json({ error: "Internal server error while adding comment" });
    }
  },
);

// GET /api/comments/:imageId - Get comments for a specific image with offset-limit pagination
commentsRouter.get(
  "/:imageId",
  isAuth({ required: false }),
  async (req, res) => {
    try {
      const { imageId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const userId = req.user?.id; // Get user ID from authenticated request (if available)

      // Validate pagination parameters
      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          error: "Invalid page parameter. Page must be a positive integer.",
        });
      }

      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          error: "Invalid limit parameter. Limit must be a positive integer.",
        });
      }

      // Check if image exists
      const image = await Image.findByPk(imageId, {
        include: [
          {
            model: Gallery,
            attributes: ["id", "UserId"],
          },
        ],
      });

      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      // If user is not authenticated, don't show comments
      if (!userId) {
        return res
          .status(401)
          .json({ error: "Authentication required to view comments" });
      }

      // Calculate offset based on page and limit
      const offset = (parsedPage - 1) * parsedLimit;

      // Get total count for pagination info
      const totalCount = await Comment.count({
        where: { ImageId: imageId },
      });

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / parsedLimit);

      // Fetch comments with offset-limit pagination
      const comments = await Comment.findAll({
        where: { ImageId: imageId },
        order: [["createdAt", "DESC"]],
        limit: parsedLimit,
        offset: offset,
        include: [
          {
            model: User,
            attributes: ["username", "id"],
          },
        ],
      });

      const mappedComments = comments.map((comment) => ({
        id: comment.id,
        imageId: comment.ImageId,
        userId: comment.UserId,
        author: comment.User ? comment.User.username : "Unknown",
        content: comment.content,
        createdAt: comment.createdAt,
        isOwnComment: comment.UserId === userId,
        canDelete:
          comment.UserId === userId || image.Gallery?.UserId === userId,
      }));

      res.json({
        comments: mappedComments,
        pagination: {
          total: totalCount,
          totalPages: totalPages,
          currentPage: parsedPage,
          limit: parsedLimit,
          hasNext: parsedPage < totalPages,
          hasPrev: parsedPage > 1,
        },
      });
    } catch (err) {
      console.error("Error retrieving comments:", err);
      res
        .status(500)
        .json({ error: "Internal server error while retrieving comments" });
    }
  },
);

// DELETE /api/comments/:id - Delete a comment
commentsRouter.delete("/:id", isAuth({ required: true }), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Get authenticated user's id from request (set by auth middleware)

    // First find the comment to check ownership
    const comment = await Comment.findByPk(id, {
      include: [
        {
          model: Image,
          include: [
            {
              model: Gallery,
              include: [
                {
                  model: User,
                  attributes: ["id"],
                },
              ],
            },
          ],
        },
        {
          model: User,
          attributes: ["id"],
        },
      ],
    });

    if (!comment) {
      return res.status(404).json({ error: `Comment(id=${id}) not found.` });
    }

    // Get the gallery owner ID (if available)
    const galleryOwnerId = comment.Image?.Gallery?.User?.id;

    // Check if user is the owner of the comment OR the owner of the gallery
    if (comment.UserId !== userId && galleryOwnerId !== userId) {
      return res
        .status(403)
        .json({ error: "You don't have permission to delete this comment" });
    }

    await comment.destroy();

    return res.status(204).send();
  } catch (err) {
    console.error("Error deleting comment:", err);

    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        error: "Cannot delete this comment due to foreign key constraints",
      });
    }

    res
      .status(500)
      .json({ error: "Internal server error while deleting comment" });
  }
});
