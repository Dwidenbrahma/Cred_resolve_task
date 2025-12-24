import { Request, Response } from "express";
import { getGroupBalances } from "../services/balance.service";

export const getBalancesByGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ message: "groupId is required" });
    }

    const balances = await getGroupBalances(groupId);
    res.status(200).json(balances);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
