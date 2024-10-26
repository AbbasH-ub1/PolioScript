// models/UC.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UCSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, 
    ucNumber: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UC", UCSchema);