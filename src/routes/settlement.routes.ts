import { Router } from "express";
import { settle } from "../controller/settlement.controller";

const router = Router();

router.post("/", settle);

export default router;
