import { Types } from "mongoose";
import Balance from "../models/Balance";

interface SettleInput {
  groupId: string;
  fromUser: string; // who owes
  toUser: string; // who receives
  amount: number;
}

export const settleBalance = async ({
  groupId,
  fromUser,
  toUser,
  amount,
}: SettleInput) => {
  const gId = new Types.ObjectId(groupId);
  const from = new Types.ObjectId(fromUser);
  const to = new Types.ObjectId(toUser);

  const balance = await Balance.findOne({
    groupId: gId,
    fromUser: from,
    toUser: to,
  });

  if (!balance) {
    throw new Error("No balance found to settle");
  }

  if (amount > balance.amount) {
    throw new Error("Settlement amount exceeds balance");
  }

  // Full settlement
  if (amount === balance.amount) {
    await balance.deleteOne();
    return { message: "Balance settled completely" };
  }

  // Partial settlement
  balance.amount -= amount;
  await balance.save();

  return { message: "Balance settled partially", remaining: balance.amount };
};
