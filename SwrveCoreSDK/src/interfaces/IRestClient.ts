import IHttpResponse from "./IHttpResponse";

export default interface IRestClient {
  get<T>(path: string, config?: RequestInit): Promise<IHttpResponse<T>>
  post<T, U>(path: string, body: T, config?: RequestInit): Promise<IHttpResponse<U>>
};