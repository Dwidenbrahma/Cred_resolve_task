import { Types } from "mongoose";
import Expense from "../models/Expense";
import Group from "../models/Group";
import Balance from "../models/Balance";
import { calculateSplit } from "../utils/split.util";
import { SplitType } from "../types/enums";

interface AddExpenseInput {
  groupId: string;
  title: string;
  paidBy: string;
  amount: number;
  participants: string[];
  splitType: SplitType;
  splits?: Record<string, number>;
}

export const addExpense = async (data: AddExpenseInput) => {
  const { groupId, title, paidBy, amount, participants, splitType, splits } =
    data;

  // 1. Validate group
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  // 2. Validate participants
  const groupMemberIds = group.members.map((id: any) => id.toString());
  participants.forEach((id) => {
    if (!groupMemberIds.includes(id)) {
      throw new Error("Participant not in group");
    }
  });

  // 3. Create expense payload (IMPORTANT)
  const expensePayload: any = {
    groupId: new Types.ObjectId(groupId),
    title,
    paidBy: new Types.ObjectId(paidBy),
    amount,
    participants: participants.map((id) => new Types.ObjectId(id)),
    splitType,
  };

  if (splits) {
    expensePayload.splits = new Map(Object.entries(splits));
  }

  const expense = await Expense.create(expensePayload);

  // 4. Split calculation
  const shareMap =
    splits !== undefined
      ? calculateSplit({
          amount,
          participants,
          splitType,
          splits,
        })
      : calculateSplit({
          amount,
          participants,
          splitType,
        });

  // 5. Update balances
  for (const userId of participants) {
    if (userId === paidBy) continue;

    const owed = shareMap[userId];
    if (owed === undefined) {
      throw new Error(`Split missing for user ${userId}`);
    }

    await updateBalance(groupId, userId, paidBy, owed);
  }

  return expense;
};

const updateBalance = async (
  groupId: string,
  fromUser: string,
  toUser: string,
  amount: number
) => {
  if (amount <= 0) return;

  const gId = new Types.ObjectId(groupId);
  const from = new Types.ObjectId(fromUser);
  const to = new Types.ObjectId(toUser);

  const same = await Balance.findOne({
    groupId: gId,
    fromUser: from,
    toUser: to,
  });
  const reverse = await Balance.findOne({
    groupId: gId,
    fromUser: to,
    toUser: from,
  });

  if (same) {
    same.amount += amount;
    await same.save();
    return;
  }

  if (reverse) {
    if (reverse.amount > amount) {
      reverse.amount -= amount;
      await reverse.save();
    } else if (reverse.amount < amount) {
      await reverse.deleteOne();
      await Balance.create({
        groupId: gId,
        fromUser: from,
        toUser: to,
        amount: amount - reverse.amount,
      });
    } else {
      await reverse.deleteOne();
    }
    return;
  }

  await Balance.create({ groupId: gId, fromUser: from, toUser: to, amount });
};
