import { getStringSize } from "../utils/StringHelper";
import { StorageManager } from "../Storage/StorageManager";
import SwrveLogger from "../utils/SwrveLogger";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import { SWRVE_EVENTS_API_VERSION } from "../utils/SwrveConstants";
import IEventBatch from "../interfaces/IEventBatch";
import { ProfileManager } from "../Profile/ProfileManager";
import IRestClient from "../interfaces/IRestClient";
import HttpError from "../RestClient/HttpError";
import SwrveConfig from "../Config/SwrveConfig";
import IHttpResponse from "../interfaces/IHttpResponse";

export class EventManager {
  public readonly MAX_QUEUE_SIZE: number = 100 * 1000;

  private config: SwrveConfig;
  private profileManager: ProfileManager;
  private deviceId: string;
  private queue: SwrveEvent[];
  private _queueSize: number = 0;

  constructor(
    public restClient: IRestClient,
    private storageManager: StorageManager,
    config: SwrveConfig,
    profileManager: ProfileManager,
    deviceId: string,
  ) {
    this.queue = [];
    this.config = config;
    this.profileManager = profileManager;
    this.deviceId = deviceId;
  }

  public queueEvent(evt: SwrveEvent): void {
    SwrveLogger.debug("QUEUE EVENT", evt);
    this.queue.push(evt);
    this.calculateQueueSize(evt);
  }

  public getQueue(): SwrveEvent[] {
    return this.queue;
  }

  public clearQueue(): void {
    this.queue = [];
    this._queueSize = 0;
  }

  public clearQueueAndStorage(userId: string): void {
    this.clearQueue();
    this.storageManager.clearData("events" + userId);
  }

  public get queueSize(): number {
    return this._queueSize;
  }

  public async sendQueue(userId: string): Promise<boolean> {
    const eventsToSend = this.getAllQueuedEvents(userId);
    this.clearStoredEvents(userId);
    this.clearQueue();

    if (eventsToSend.length > 0) {
      return this.postQueuedEvents(eventsToSend)
      .then(() => {
        return true;
      })
      .catch((error) => {
        SwrveLogger.error(
          `Error sending events :: ${error.name} - ${error.message}`
        );
        if ((error instanceof HttpError) === false || error.code === 500) {
          /* Rollback and restore queue on 500 or Unknown error */
          this.storeEvents(
            [...eventsToSend, ...this.getAllQueuedEvents(userId)],
            userId
          );
        }
        return false;
      });
    }
    return Promise.resolve(false);
  }

  public getAllQueuedEvents(userId: string): SwrveEvent[] {
    return [...this.queue, ...this.getStoredEvents(userId)];
  }

  public getStoredEvents(userId: string): SwrveEvent[] {
    const storedEvents = this.storageManager.getData(
      this.getStorageKey(userId)
    );
    try {
      return storedEvents ? JSON.parse(storedEvents) : [];
    } catch (e) {
      return [];
    }
  }

  public saveEventsToStorage(userId: string): void {
    if (this.queue.length > 0) {
      const allEvents = this.getAllQueuedEvents(userId);
      this.clearQueue();
      this.storeEvents(allEvents, userId);
    } else {
      SwrveLogger.info("nothing to save");
    }
  }

  private storeEvents(events: ReadonlyArray<SwrveEvent>, userId: string): void {
    const data = JSON.stringify(events);
    this.storageManager.saveData(this.getStorageKey(userId), data);
    this._queueSize += getStringSize(data) - Math.max(events.length - 1, 0) - 2; /* subtract delimiting commas and [] */
  }

  private calculateQueueSize(evt: SwrveEvent): void {
    const evtString = JSON.stringify(evt);
    this._queueSize += getStringSize(evtString);
  }

  private clearStoredEvents(userId: string): void {
    this.storageManager.clearData(this.getStorageKey(userId));
  }

  private getStorageKey(userId: string): string {
    return "events" + userId;
  }

  private async postQueuedEvents(events: ReadonlyArray<SwrveEvent>): Promise<IHttpResponse<any>> {
    const path = `${this.config.EventsUrl}/1/batch`;

    const body: IEventBatch = {
      user: this.profileManager.currentUser.userId,
      app_version: this.config.AppVersion,
      session_token: this.profileManager.getSessionToken(),
      version: SWRVE_EVENTS_API_VERSION,
      unique_device_id: this.deviceId,
      data: events,
    };

    return await this.restClient.post<IEventBatch, any>(path, body);
  }
}
