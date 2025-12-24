import { Schema, model, Types } from "mongoose";

const groupSchema = new Schema(
  {
    groupName: { type: String, required: true },

    members: [{ type: Types.ObjectId, ref: "User-expense" }],
  },
  { timestamps: true }
);

export default model("Group", groupSchema);
