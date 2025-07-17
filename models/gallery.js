import { sequelize } from "../datasource.js";
import { DataTypes } from "sequelize";
import { User } from "./user.js";

export const Gallery = sequelize.define(
  "Gallery",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["name", "UserId"],
      },
    ],
  },
);

Gallery.belongsTo(User, {
  onDelete: "CASCADE",
  uniqueKey: false,
});
User.hasMany(Gallery, {
  onDelete: "CASCADE",
});
