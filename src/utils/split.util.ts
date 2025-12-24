import { SplitType } from "../types/enums";

interface SplitInput {
  amount: number;
  participants: string[];
  splitType: SplitType;
  splits?: Record<string, number>;
}

export const calculateSplit = ({
  amount,
  participants,
  splitType,
  splits,
}: SplitInput): Record<string, number> => {
  switch (splitType) {
    case SplitType.EQUAL:
      return equalSplit(amount, participants);

    case SplitType.EXACT:
      if (!splits) throw new Error("Exact splits required");
      return exactSplit(amount, splits);

    case SplitType.PERCENT:
      if (!splits) throw new Error("Percent splits required");
      return percentSplit(amount, splits);

    default:
      throw new Error("Invalid split type");
  }
};

const equalSplit = (
  amount: number,
  participants: string[]
): Record<string, number> => {
  const share = Number((amount / participants.length).toFixed(2));
  const result: Record<string, number> = {};
  participants.forEach((id) => (result[id] = share));
  return result;
};

const exactSplit = (
  amount: number,
  splits: Record<string, number>
): Record<string, number> => {
  const total = Object.values(splits).reduce((s, v) => s + v, 0);
  if (total !== amount) throw new Error("Exact split must sum to amount");
  return splits;
};

const percentSplit = (
  amount: number,
  splits: Record<string, number>
): Record<string, number> => {
  const total = Object.values(splits).reduce((s, v) => s + v, 0);
  if (total !== 100) throw new Error("Percent split must sum to 100");

  const result: Record<string, number> = {};
  Object.entries(splits).forEach(([userId, percent]) => {
    result[userId] = Number(((percent / 100) * amount).toFixed(2));
  });
  return result;
};
