import { Router } from "express";
import {
  createGroup,
  addMemberToGroup,
  getGroupById,
} from "../controller/group.controller";

const router = Router();

router.post("/", createGroup);
router.post("/:groupId/add-member", addMemberToGroup);
router.get("/:groupId", getGroupById);

export default router;
