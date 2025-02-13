export class SessionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SessionError';
    }
}

export class SessionNotFoundError extends SessionError {
    constructor(sessionId: string) {
        super(`会话不存在: ${sessionId}`);
        this.name = 'SessionNotFoundError';
    }
}

export class SessionLimitExceededError extends SessionError {
    constructor() {
        super('会话数量已达到上限');
        this.name = 'SessionLimitExceededError';
    }
}

export class InvalidSessionDataError extends SessionError {
    constructor(message: string) {
        super(`会话数据无效: ${message}`);
        this.name = 'InvalidSessionDataError';
    }
}

export class StorageOperationError extends SessionError {
    constructor(operation: string, error: Error) {
        super(`存储操作失败 (${operation}): ${error.message}`);
        this.name = 'StorageOperationError';
    }
}