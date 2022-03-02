import { StorageManager } from "../Storage/StorageManager";
import { IUserResource } from "../interfaces/ISwrveCampaign";
import { ResourceManager } from "./ResourceManager";
import { SwrveResource } from "./SwrveResource";

interface ISwrveResourceIndex {
  [key: string]: SwrveResource;
}

export class ResourceManagerInternal {
  private resourceManager: ResourceManager;
  private storageManager: StorageManager;
  private resourcesIndex?: ISwrveResourceIndex;
  private resources?: ReadonlyArray<IUserResource>;


  constructor(
    storageManager: StorageManager
    ) {
    this.storageManager = storageManager;
    const getResources = (): IUserResource[] | null => {
      /* return a copy */
      return this.resources
        ? this.resources.map((resource) => ({ ...resource }))
        : null;
    };
    const getResource = (resourceId: string): SwrveResource => {
      return (
        (this.resourcesIndex && this.resourcesIndex[resourceId]) ||
        new SwrveResource({})
      );
    };
    this.resourceManager = new ResourceManager(getResources, getResource);
  }

  public storeResources(
    resources: ReadonlyArray<IUserResource>,
    userId: string
  ): void {
    this.setResources(resources);
    this.storageManager.saveDataWithMD5Hash(
      "resources" + userId,
      JSON.stringify(resources)
    );
  }

  public async getResources(userId: string): Promise<IUserResource[] | null> {
    return this.storageManager.getDataWithMD5Hash("resources" + userId).then(
      (data) => {
        let resources = null;
        if (data) {
          resources = JSON.parse(data);
        }
        this.setResources(resources);
        return resources;
      }
    );
  }

  public getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  private setResources(resources: ReadonlyArray<IUserResource>): void {
    this.resources = resources;
    this.resourcesIndex = (resources || []).reduce(
      (result: ISwrveResourceIndex, item: IUserResource) => {
        result[item.uid] = new SwrveResource(item);
        return result;
      },
      {}
    );
  }
}
