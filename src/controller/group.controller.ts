import { Request, Response } from "express";
import * as groupService from "../services/group.service";

export const createGroup = async (req: Request, res: Response) => {
  try {
    const group = await groupService.createGroup(req.body);
    res.status(201).json({
      message: "success",
      data: group,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Failed to create group",
      error: err.message,
    });
  }
};

export const addMemberToGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    if (!groupId) {
      return res.status(400).json({ message: "groupId is required" });
    }
    const group = await groupService.addMemberToGroup(groupId, userId);

    res.status(201).json({
      message: "Success added to group",
      data: group,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to add member to group",
      error: error.message,
    });
  }
};

export const getGroupById = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ message: "groupId is required" });
    }
    const group = await groupService.getGroupId(groupId);
    res.status(200).json({
      messgae: "success",
      data: group,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch group",
      error: error.message,
    });
  }
};
