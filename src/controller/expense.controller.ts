import { Request, Response } from "express";
import { addExpense } from "../services/expense.service";

export const createExpense = async (req: Request, res: Response) => {
  try {
    const expense = await addExpense(req.body);
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
