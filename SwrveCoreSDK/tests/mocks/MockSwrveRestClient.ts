import IRestClient from "../../src/interfaces/IRestClient";
import IHttpResponse from "../../src/interfaces/IHttpResponse";
import HttpError from "../../src/RestClient/HttpError";

const DEFAULT_RESPONSE = {
  status: 200,
  statusText: "mock rest client",
  headers: new Headers(),
  json: () => {{}},
  throwsNetworkError: () => {},
};

export class MockSwrveRestClient implements IRestClient {
  constructor(
    public response: any = DEFAULT_RESPONSE,
    public delayResponse?: number
  ) {}

  public changeResponse(response: any, delayResponse?: number): void {
    this.response = { ...DEFAULT_RESPONSE, ...response };
    this.delayResponse = delayResponse || this.delayResponse;
  }

  public async get<T>(path: string, config?: RequestInit): Promise<IHttpResponse<T>> {
    return await this.http<T>();
  }

  public async post<T, U>(path: string, body: T, config?: any): Promise<IHttpResponse<U>> {
    return await this.http<U>();
  }

  private async http<T>(): Promise<IHttpResponse<T>> {
    this.response.throwsNetworkError();
    const _response: IHttpResponse<T> = {
      etag: this.response.headers.get("etag"),
      data: this.response.json()
    }

    return new Promise<IHttpResponse<T>>((resolve, _) => {
      if (this.response.status === 200) {
        if (this.delayResponse) {
          setTimeout(() => {
            resolve(_response);
          }, this.delayResponse);
        } else {
          resolve(_response);
        }
      } else {
        throw new HttpError(this.response.status, this.response.statusText);
      }
    });
  }
}

export default MockSwrveRestClient;