export const enum RefinedSetsErrorCode {
    InvalidArgument = 'invalid-argument',
    InternalError = 'internal-error',
    NotSupported = 'not-supported',
    Uninitialized = 'uninitialized',
    InvalidOperation = 'invalid-operation',
}

export class RefinedSetsError extends Error {
    public constructor(
        public readonly type: RefinedSetsErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'RefinedSetsError';
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public toString(): string {
        return `${this.name} [${this.type}]: ${this.message}`;
    }

    public static invalidArgument(message: string): RefinedSetsError {
        return new RefinedSetsError(RefinedSetsErrorCode.InvalidArgument, message);
    }
    public static internalError(message: string): RefinedSetsError {
        return new RefinedSetsError(RefinedSetsErrorCode.InternalError, message);
    }
    public static notSupported(message: string): RefinedSetsError {
        return new RefinedSetsError(RefinedSetsErrorCode.NotSupported, message);
    }
    public static uninitialized(message: string): RefinedSetsError {
        return new RefinedSetsError(RefinedSetsErrorCode.Uninitialized, message);
    }
    public static invalidOperation(message: string): RefinedSetsError {
        return new RefinedSetsError(RefinedSetsErrorCode.InvalidOperation, message);
    }
}
