import { Schema, model, Types, Document } from "mongoose";
import { SplitType } from "../types/enums";

export interface ExpenseDocument extends Document {
  groupId: Types.ObjectId;
  title: string;
  paidBy: Types.ObjectId;
  amount: number;
  participants: Types.ObjectId[];
  splitType: SplitType;
  splits?: Map<string, number>;
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    groupId: {
      type: Types.ObjectId,
      ref: "Group",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    paidBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    participants: [
      {
        type: Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    splitType: {
      type: String,
      enum: Object.values(SplitType),
      required: true,
    },

    splits: {
      type: Map,
      of: Number,
    },
  },
  { timestamps: true }
);

const Expense = model<ExpenseDocument>("Expense", expenseSchema);
export default Expense;
