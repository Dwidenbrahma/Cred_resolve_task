import { Schema, model, Types, Document } from "mongoose";

export interface BalanceDocument extends Document {
  groupId: Types.ObjectId;
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  amount: number;
}

const balanceSchema = new Schema<BalanceDocument>(
  {
    groupId: {
      type: Types.ObjectId,
      ref: "Group",
      required: true,
    },

    fromUser: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    toUser: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// One balance per pair per group
balanceSchema.index({ groupId: 1, fromUser: 1, toUser: 1 }, { unique: true });

const Balance = model<BalanceDocument>("Balance", balanceSchema);
export default Balance;
