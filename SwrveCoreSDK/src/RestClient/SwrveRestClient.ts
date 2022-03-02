import HttpError from "./HttpError";
import IHttpResponse from "../interfaces/IHttpResponse";
import IRestClient from "../interfaces/IRestClient";

export class SwrveRestClient implements IRestClient {

  public async get<T>(path: string, config?: RequestInit): Promise<IHttpResponse<T>> {
    const init: RequestInit = { method: "GET", ...config };

    return await this.http<T>(new Request(path, init));
  }

  public async post<T, U>(path: string, body: T, config?: RequestInit): Promise<IHttpResponse<U>> {
    const init: RequestInit = {
      method: "POST",
      body: JSON.stringify(body),
      cache: "no-cache",
      headers: new Headers([["Content-Type", "application/json"]]),
      ...config
    };

    return await this.http<U>(new Request(path, init));
  }

  private async http<T>(request: Request): Promise<IHttpResponse<T>> {
    const response = await fetch(request);
    if (!response.ok) throw new HttpError(response.status, response.statusText);

    return {
      etag: response.headers.get("etag"),
      data: await response.json().catch(() => {{}})
    } as IHttpResponse<T>;
  }
}