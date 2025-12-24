import Group from "../models/Group";
import User from "../models/User";

export const createGroup = async (data: { name: string }) => {
  return await Group.create({
    groupName: data.name,
    members: [],
  });
};

export const addMemberToGroup = async (groupId: string, userId: string) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new Error("Group not found");
  }
  if (!group.members.includes(user._id)) {
    group.members.push(user._id);
    await group.save();
  }

  return group;
};

export const getGroupId = async (groupId: string) => {
  const group = await Group.findById(groupId).populate("members");
  if (!group) {
    throw new Error("Group not found");
  }

  return group;
};
