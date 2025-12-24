import { Router } from "express";
import { getBalancesByGroup } from "../controller/balance.controller";

const router = Router();

router.get("/:groupId", getBalancesByGroup);

export default router;
