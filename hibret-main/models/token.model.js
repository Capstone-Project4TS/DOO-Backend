import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ObjectId = Schema.Types.ObjectId;

const tokenSchema = new Schema({
  userId: {
    type: ObjectId,
    required: true,
    ref: "User",
  },
  token: { type: String, required: true },
  createdAt: { type: Date, required: true, default: new Date(), expires: 43200 },
});

const Token = model("Token", tokenSchema);

export default Token;
