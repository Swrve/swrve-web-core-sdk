import { md5Async } from "../utils/md5";
import { NO_SYNCHRONOUS_STORAGE } from "../utils/SwrveConstants";
import { IPlatform } from "../interfaces/IPlatform";

export class StorageManager {
  private platform: IPlatform;

  constructor(platform: IPlatform){
    this.platform = platform;
  }

  public saveData(key: string, data: string): void {
    this.getStorage().setItem(this.getKey(key), data);
  }

  public getData(key: string): string | null {
    return this.getStorage().getItem(this.getKey(key));
  }

  public clearData(key: string): void {
    this.getStorage().removeItem(this.getKey(key));
  }

  public saveDataWithMD5Hash(key: string, data: string): Promise<void> {
    const store = this.getStorage();
    return md5Async(key + data).then((md5) => {
      store.setItem(this.getKey(key), data);
      store.setItem(this.getHashKey(key), md5);
    });
  }

  public getDataWithMD5Hash(key: string): Promise<string | null> {
    const store = this.getStorage();
    const data = store.getItem(this.getKey(key));
    const hash = store.getItem(this.getHashKey(key));

    return md5Async(key + data).then((rehash) =>
      hash === rehash ? data : null
    );
  }

  private getKey(key: string): string {
    return "swrve." + key;
  }

  private getHashKey(key: string): string {
    return "swrve." + key + ".hash";
  }

  private getStorage(): Storage {
    const store = this.platform.synchronousStorage;
    if (!store) {
      throw new Error(NO_SYNCHRONOUS_STORAGE);
    }
    return store;
  }
}
