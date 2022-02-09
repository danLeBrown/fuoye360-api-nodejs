"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BroadcastRetweet extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BroadcastRetweet.belongsTo(models.Broadcast, {
        foreignKey: "broadcast_id",
      });
    }
  }
  BroadcastRetweet.init(
    {
      user_id: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      post_id: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      timestamps: true,
      updatedAt: "created_at",
      createdAt: "updated_at",
      modelName: "BroadcastRetweet",
      tableName: "broadcast_retweets",
    }
  );
  return BroadcastRetweet;
};