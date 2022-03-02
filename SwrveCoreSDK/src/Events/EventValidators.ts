import IReward from "../interfaces/IReward";
import IReadonlyDictionary from "../interfaces/IReadonlyDictionary";

export function validateRewards(rewards: IReadonlyDictionary<IReward>): void {
  for (const rewardName of Object.keys(rewards)) {
    if (rewardName == null || rewardName === "") {
      throw new Error("Reward resource name cannot be empty.");
    }

    validateReward(rewards[rewardName]);
  }
}

export function validateReward(reward: IReward): void {
  if (!isFinite(reward.amount) || reward.amount <= 0) {
    throw new Error("Reward amount must be a positive number.");
  }
}
