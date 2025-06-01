class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        error = [],
        data = null,
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.message = message;
        this.error = error;
        this.data = data;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;
