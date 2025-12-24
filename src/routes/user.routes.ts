import { Router } from "express";
import { createUser, getUsers } from "../controller/user.controller";

const router = Router();

router.post("/", createUser);
router.get("/", getUsers);

export default router;
