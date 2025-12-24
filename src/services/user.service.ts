import User from "../models/User";

const createUser = async (data: { name: string; email: string }) => {
  return User.create(data);
};

const getUsers = async () => {
  return User.find();
};

export { createUser, getUsers };
