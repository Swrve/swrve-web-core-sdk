class HttpError extends Error {
    public code: number;
  
    constructor(code: number, message: string) {
      super(message);
      this.name = "SwrveHttpError"
      this.code = code;
      /* Set the prototype explicitly. */
      (<any>Object).setPrototypeOf(this, HttpError.prototype)
    }
  }
  
  export default HttpError;