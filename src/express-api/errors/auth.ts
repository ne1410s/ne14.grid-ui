export class ServiceError extends Error {

    constructor(
            public readonly message: string,
            public readonly status: number,
            public readonly errors: Array<string>) {

        super(message);
    }
}

export class AuthError extends ServiceError {

    constructor() {
        super('Access denied', 401, undefined);
    }
}