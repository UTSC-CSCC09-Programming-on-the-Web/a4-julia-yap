import { sequelize } from "../datasource.js";
import { DataTypes } from "sequelize";
import { User } from "./user.js";
import { Gallery } from "./gallery.js";

export const Image = sequelize.define(
  "Image",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["title", "GalleryId", "UserId"],
      },
    ],
  },
);

Image.belongsTo(User, {
  onDelete: "CASCADE",
  uniqueKey: false,
});
User.hasMany(Image, {
  onDelete: "CASCADE",
});

Image.belongsTo(Gallery, {
  onDelete: "CASCADE",
  uniqueKey: false,
});
Gallery.hasMany(Image, {
  onDelete: "CASCADE",
});
