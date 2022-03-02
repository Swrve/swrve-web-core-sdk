import { getSessionToken } from "../utils/CryptoHelper";
import { IUser } from "../interfaces/IUser";
import { IQAUser } from "../interfaces/ISwrveCampaign";
import { StorageManager } from "../Storage/StorageManager";
import SwrveLogger from "../utils/SwrveLogger";
import { generateUuid } from "../utils/uuid";
import DateHelper from "../utils/DateHelper";

export class ProfileManager {
  private _currentUser: IUser;
  private storageManager: StorageManager;
  constructor(
    public userId: string,
    private readonly appId: number,
    private readonly apiKey: string,
    private readonly newSessionInterval: number,
    storageManager: StorageManager
  ) {
    this.storageManager = storageManager;
    const currentUser = this.storageManager.getData(userId);

    let session_token = getSessionToken(
      this.userId,
      this.appId,
      this.apiKey,
      new Date()
    );

    if (currentUser) {
      this._currentUser = JSON.parse(currentUser);
      this.resolveCurrentUser(session_token);
    } else {
      this._currentUser = {
        userId,
        sessionToken: session_token,
        sessionStart: DateHelper.nowInUtcTime(),
        isQAUser: false,
        nextSeqNum: 0,
        firstUse: 0,
        lastSessionEnd: 0,
        isAnonymous: true,
      };
    }

    this.storageManager.saveData(userId, JSON.stringify(this._currentUser));
  }

  public hasSessionRestored(): boolean {
    if (this.currentUser.lastSessionEnd !== 0) {
      const lastSession: number = this.currentUser.lastSessionEnd;
      const now: number = Number(DateHelper.nowInUtcTime());
      const expirationTimeout: number = this.newSessionInterval * 1000; /** convert to ms */
      SwrveLogger.debug(`current time ${now}`);
      SwrveLogger.debug(`lastSession: ${lastSession}`);
      const diffTime: number = now - lastSession;
      SwrveLogger.debug(`Diff now - lastSession: ${diffTime}`);
      if (lastSession && diffTime > expirationTimeout) {
        SwrveLogger.debug('session has expired.');
        return false;
      }
      SwrveLogger.debug('session still active');
      return true;
    }
    SwrveLogger.debug('no session. treating as expired');
    return false;
  }

  public getNextSequenceNumber(): number {
    const nextSeqNum = ++this._currentUser.nextSeqNum;
    this.storageManager.saveData(
      this._currentUser.userId,
      JSON.stringify(this._currentUser)
    );

    return nextSeqNum;
  }

  public getSessionToken(): string {
    return this._currentUser.sessionToken;
  }

  public getSwrveIdByExternalUserID(externalUserId: string): string | null {
    const cachedSwrveId = this.storageManager.getData(`ext-${externalUserId}`);
    return cachedSwrveId !== null ? cachedSwrveId : null;
  }

  public cacheExternalUserID(externalUserId: string, swrveId: string): void {
    this.storageManager.saveData(`ext-${externalUserId}`, swrveId);
  }

  public storeUserId(userId: string): void {
    this.storageManager.saveData("user_id", userId);
  }

  public getStoredUserId(): string | null {
    return this.storageManager.getData("user_id");
  }

  public isUserIdVerified(userId: string): boolean {
    const verified = this.storageManager.getData("verified-" + userId);
    if (verified) {
      return true;
    }
    return false;
  }

  public setUserIdAsVerified(userId: string): void {
    if (!this.isUserIdVerified(userId)) {
      this.storageManager.saveData("verified-" + userId, "VERIFIED");
    }
  }

  public setCurrentUserAsNewAnonymousUser(): void {
    const newAnonUserId = generateUuid().toString();
    this.setCurrentUser(newAnonUserId, true);
  }

  public setCurrentUser(
    newUserId: string,
    markAsAnonymous: boolean = false,
    externalUserId?: string
  ): void {
    let session_token = getSessionToken(
      newUserId,
      this.appId,
      this.apiKey,
      new Date()
    );
    const currentUser = this.storageManager.getData(newUserId);

    if (currentUser) {
      this._currentUser = JSON.parse(currentUser);
      this.resolveCurrentUser(session_token);
    } else {
      this._currentUser = {
        userId: newUserId,
        sessionToken: session_token,
        sessionStart: DateHelper.nowInUtcTime(),
        isQAUser: false,
        nextSeqNum: 1,
        firstUse: 0,
        lastSessionEnd: 0,
        isAnonymous: markAsAnonymous,
        externalUserId
      };
    }

    this.storageManager.saveData(newUserId, JSON.stringify(this._currentUser));
    this.storageManager.saveData("user_id", this.currentUser.userId);
  }

  public set firstUse(firstUseDate: number) {
    this.currentUser.firstUse = firstUseDate;
    this.storageManager.saveData(
      this._currentUser.userId,
      JSON.stringify(this._currentUser)
    );
  }

  public get currentUser(): IUser {
    return this._currentUser;
  }

  public setExternalUserId(externalUserId: string): void {
    this.currentUser.externalUserId = externalUserId;
    this.currentUser.isAnonymous = false; /**  we have an external userId, it's no longer anon */
    this.storageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
  }

  public setAsQAUser(qaUserNode: IQAUser): void {
    this.currentUser.isQAUser = true;
    this.currentUser.qaUser = qaUserNode;

    this.storageManager.saveData(
      this.currentUser.userId,
      JSON.stringify(this._currentUser)
    );
  }

  public clearQAUser(): void {
    /** dont clear the sequence number in case they come back as a QA user sometime in the future */ 
    this.currentUser.isQAUser = false;
    this.storageManager.saveData(
      this._currentUser.userId,
      JSON.stringify(this._currentUser)
    );
  }

  public isQAUser(): boolean {
    return this._currentUser.isQAUser;
  }

  public get QAUser(): IQAUser | undefined {
    return this.isQAUser() ? this._currentUser.qaUser : undefined;
  }

  public storeEtagHeader(etag: string): void {
    SwrveLogger.info(
      "New Etag " + etag + " Old etag " + this._currentUser.etag
    );
    this._currentUser.etag = etag;
    this.storageManager.saveData(
      this.currentUser.userId,
      JSON.stringify(this._currentUser)
    );
  }

  public clearEtagHeader(): void {
    this.currentUser.etag = undefined;
    this.storageManager.saveData(
      this._currentUser.userId,
      JSON.stringify(this._currentUser)
    );
  }

  public saveCurrentUserBeforeSessionEnd() {
    this._currentUser.lastSessionEnd = DateHelper.nowInUtcTime();
    this.storageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
    this.storageManager.saveData("user_id", this.currentUser.userId);
    SwrveLogger.debug(`saved last session end: ${this._currentUser.lastSessionEnd}`);
  }

  private resolveCurrentUser(session_token: string){
    const userId = this._currentUser.userId;
    if (this.hasSessionRestored()) {

      if (!this._currentUser.sessionStart) {
        const previousSessionStart = new Date(this._currentUser.sessionStart);
        session_token = getSessionToken(userId, this.appId, this.apiKey, previousSessionStart);
      }

      this.restoreCurrentUser(session_token, userId, this._currentUser.sessionStart);
    } else {
      this.restoreCurrentUser(session_token, userId, DateHelper.nowInUtcTime());
    }
  }

  private restoreCurrentUser(session_token: string, userId: string, newSessionStart: number): void {
    this._currentUser.sessionToken = session_token;
    this._currentUser.sessionStart = newSessionStart;
    this._currentUser.userId = userId;
  }
}
