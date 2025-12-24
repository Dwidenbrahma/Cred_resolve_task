import { Router } from "express";
import { createExpense } from "../controller/expense.controller";

const router = Router();

router.post("/", createExpense);

export default router;
