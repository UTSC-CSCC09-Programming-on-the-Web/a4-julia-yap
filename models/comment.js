import { sequelize } from "../datasource.js";
import { DataTypes } from "sequelize";
import { Image } from "./image.js";
import { User } from "./user.js";

export const Comment = sequelize.define("Comment", {
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

Comment.belongsTo(Image, {
  onDelete: "CASCADE",
});
Image.hasMany(Comment, {
  onDelete: "CASCADE",
});

Comment.belongsTo(User, {
  onDelete: "CASCADE",
});
User.hasMany(Comment, {
  onDelete: "CASCADE",
});
