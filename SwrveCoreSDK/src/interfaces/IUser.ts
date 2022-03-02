import { IQAUser } from "./ISwrveCampaign";

export interface IUser {
  userId: string;
  sessionToken: string;
  nextSeqNum: number;
  firstUse: number;
  sessionStart: number;
  lastSessionEnd: number;
  isAnonymous: boolean;
  etag?: string;
  isQAUser: boolean;
  qaUser?: IQAUser;
  externalUserId?: string;
}

export interface IUserInfo {
  readonly userId: string;
  readonly externalUserId?: string;
  readonly firstUse: number;
  readonly sessionStart: number;
  readonly isQAUser: boolean;
}
