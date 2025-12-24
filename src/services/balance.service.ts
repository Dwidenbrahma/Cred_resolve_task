import { Types } from "mongoose";
import Balance from "../models/Balance";

export const getGroupBalances = async (groupId: string) => {
  return Balance.find({ groupId: new Types.ObjectId(groupId) })
    .populate("fromUser", "name")
    .populate("toUser", "name");
};
