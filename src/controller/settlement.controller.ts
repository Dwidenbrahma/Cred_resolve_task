import { Request, Response } from "express";
import { settleBalance } from "../services/settlement.service";

export const settle = async (req: Request, res: Response) => {
  try {
    const result = await settleBalance(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
