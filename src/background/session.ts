import { Message, Session } from '../types/types';
import { SessionError, SessionNotFoundError, SessionLimitExceededError, InvalidSessionDataError, StorageOperationError } from '../types/errors';

export class SessionManager {
    private static currentSession: Session | null = null;
    private static DEBUG = true;
    private static readonly STORAGE_KEY = 'sessions';
    private static readonly MAX_SESSIONS = 100;

    // sess参数非必填
    static async handleSessionRequest(operate: string, sess: Session | null): Promise<any> {
        try {
            // 不需要 sess 参数的操作
            switch (operate) {
                case 'getSessions':
                    return { sessions: await this.getSessions() };
                case 'getCurrentSession':
                    return { session: this.getCurrentSession() };
                case 'createSession':
                    return { session: await this.createSession() };
            }

            // 需要 sess 参数的操作
            if (!sess?.id) {
                throw new InvalidSessionDataError('会话ID不能为空');
            }
            switch (operate) {
                case 'setCurrentSession':
                    this.currentSession = await this.getSession(sess.id);
                    return { success: true };
                case 'deleteSession':
                    return { success: await this.deleteSession(sess.id) };
                case 'getSessionMessages':
                    return { messages: await this.getSessionMessages(sess.id) };
                case 'toggleSessionPin':
                    return { session: await this.toggleSessionPin(sess.id) };
                case 'updateSessionTitle':
                    if (!sess.title) {
                        throw new InvalidSessionDataError('会话标题不能为空');
                    }
                    return { session: await this.updateSessionTitle(sess.id, sess.title) };
                default:
                    throw new Error('未知的会话操作类型');
            }
        } catch (error) {
            this.log('handleSessionRequest', '处理会话请求失败', error);
            throw error instanceof SessionError ? error : new StorageOperationError('处理会话请求', error as Error);
        }
    }

    static async toggleSessionPin(sessionId: string): Promise<Session> {
        if (!sessionId) {
            throw new InvalidSessionDataError('会话ID不能为空');
        }

        try {
            const sessions = await this.loadFromStorage();
            const session = sessions.find(s => s.id === sessionId);

            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }

            session.isPinned = !session.isPinned;
            session.timestamp = Date.now();

            await this.saveToStorage(sessions);
            if (this.currentSession?.id === sessionId) {
                this.currentSession = session;
            }
            return session;
        } catch (error) {
            throw error instanceof SessionError ? error : new StorageOperationError('切换会话置顶状态', error as Error);
        }
    }

    private static log(method: string, message: string, data?: any): void {
        if (this.DEBUG) {
            console.log(`[SessionManager:${method}] ${message}`, data || '');
        }
    }

    static async init(): Promise<void> {
        try {
            this.currentSession = await this.createSession();
            this.log('init', '会话管理器初始化成功', this.currentSession);
        } catch (error) {
            this.log('init', '会话管理器初始化失败', error);
            throw new StorageOperationError('初始化会话管理器', error as Error);
        }
    }

    static getCurrentSession(): Session | null {
        return this.currentSession;
    }

    static getCurrentSessionID(): string | null {
        return this.currentSession?.id || null;
    }

    private static async saveToStorage(sessions: Session[]): Promise<void> {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: sessions });
    }

    private static async loadFromStorage(): Promise<Session[]> {
        const { sessions = [] } = await chrome.storage.local.get([this.STORAGE_KEY]);
        return sessions;
    }

    static async createSession(): Promise<Session> {
        this.log('createSession', '开始创建新会话');
        try {
            const session: Session = {
                id: Date.now().toString(),
                title: '新会话',
                messages: [],
                lastMessage: '',
                timestamp: Date.now(),
                messagesCount: 0
            };

            const sessions = await this.loadFromStorage();
            sessions.push(session);
            await this.saveToStorage(sessions);
            this.currentSession = session;
            this.log('createSession', '会话创建成功', session);
            return session;
        } catch (error) {
            this.log('createSession', '会话创建失败', error);
            throw new StorageOperationError('创建会话', error as Error);
        }
    }

    static async updateSession(sessionId: string, newMessage: Message): Promise<Session> {
        if (!sessionId || !newMessage?.content) {
            throw new InvalidSessionDataError('会话ID或消息内容不能为空');
        }

        try {
            const sessions = await this.loadFromStorage();
            let session = sessions.find(s => s.id === sessionId);

            if (!session) {
                if (this.currentSession?.id === sessionId) {
                    session = this.currentSession;
                    if (sessions.length >= this.MAX_SESSIONS) {
                        throw new SessionLimitExceededError();
                    }
                    sessions.push(session);
                } else {
                    throw new SessionNotFoundError(sessionId);
                }
            }

            session.messages.push(newMessage);
            session.lastMessage = newMessage.content[0]?.text || '';
            session.timestamp = Date.now();
            session.messagesCount = session.messages.length;

            await this.saveToStorage(sessions);
            if (sessionId === this.currentSession?.id) {
                this.currentSession = session;
            }

            this.log('updateSession', '会话更新成功', session);
            return session;
        } catch (error) {
            throw error instanceof SessionError ? error : new StorageOperationError('更新会话', error as Error);
        }
    }

    static async getSessions(): Promise<Session[]> {
        try {
            const sessions = await this.loadFromStorage();
            return sessions.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });
        } catch (error) {
            throw new StorageOperationError('获取会话列表', error as Error);
        }
    }

    static async getSession(sessionId: string): Promise<Session> {
        if (!sessionId) {
            throw new InvalidSessionDataError('会话ID不能为空');
        }

        if (this.currentSession?.id === sessionId) {
            return this.currentSession;
        }

        try {
            const sessions = await this.loadFromStorage();
            const session = sessions.find(s => s.id === sessionId);
            if (!session) throw new SessionNotFoundError(sessionId);
            return session;
        } catch (error) {
            throw error instanceof SessionError ? error : new StorageOperationError('获取会话详情', error as Error);
        }
    }

    static async deleteSession(sessionId: string): Promise<boolean> {
        if (!sessionId) {
            throw new InvalidSessionDataError('会话ID不能为空');
        }

        try {
            const sessions = await this.loadFromStorage();
            const filteredSessions = sessions.filter(s => s.id !== sessionId);

            if (filteredSessions.length === sessions.length) {
                throw new SessionNotFoundError(sessionId);
            }

            await this.saveToStorage(filteredSessions);
            if (this.currentSession?.id === sessionId) {
                this.currentSession = null;
            }
            return true;
        } catch (error) {
            throw error instanceof SessionError ? error : new StorageOperationError('删除会话', error as Error);
        }
    }

    static async getSessionMessages(sessionId: string): Promise<Message[]> {
        const session = await this.getSession(sessionId);
        return session.messages;
    }

    static async clearSessions(): Promise<void> {
        try {
            await chrome.storage.local.remove([this.STORAGE_KEY]);
            this.currentSession = null;
        } catch (error) {
            throw new StorageOperationError('清空会话', error as Error);
        }
    }

    static async updateSessionTitle(sessionId: string, newTitle: string): Promise<Session> {
        if (!sessionId || !newTitle.trim()) {
            throw new InvalidSessionDataError('会话ID或标题不能为空');
        }

        try {
            const sessions = await this.loadFromStorage();
            const session = sessions.find(s => s.id === sessionId);

            if (!session) {
                throw new SessionNotFoundError(sessionId);
            }

            session.title = newTitle.trim();
            session.timestamp = Date.now();

            await this.saveToStorage(sessions);
            if (this.currentSession?.id === sessionId) {
                this.currentSession = session;
            }
            return session;
        } catch (error) {
            throw error instanceof SessionError ? error : new StorageOperationError('更新会话标题', error as Error);
        }
    }
}