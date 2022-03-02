export default interface IHttpResponse<T> {
  data: T;
  etag: string | null;
}
