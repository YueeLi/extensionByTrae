import { ModelConfig } from '../types/model';
import { ChatMessage } from '../types/message';
import { MultiModelChatRequest, MultiModelChatResponse, MultiModelSession, ModelResponse } from '../types/multi-model';
import { APIRequestManager } from './api-request-manager';

// 错误类型枚举
enum MultiModelError {
    SAVE_SESSION_FAILED = 'SAVE_SESSION_FAILED',
    MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
    API_CALL_FAILED = 'API_CALL_FAILED',
    INVALID_RESPONSE = 'INVALID_RESPONSE'
}

/**
 * 多模型会话管理器
 * 负责管理多模型会话的存储、清理和过期处理
 */
export class MultiModelSessionManager {
    private static readonly MAX_HISTORY = 30;
    private static readonly MAX_RETRY_ATTEMPTS = 3;
    private static readonly RETRY_DELAY = 1000; // 1秒
    private static readonly SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 一周

    /**
     * 保存会话记录
     * @param session 会话信息
     * @throws Error 当保存失败时抛出错误
     */
    static async saveSession(session: MultiModelSession): Promise<void> {
        let attempts = 0;
        while (attempts < this.MAX_RETRY_ATTEMPTS) {
            try {
                const history = await chrome.storage.local.get(['multiModelHistory']);
                const sessions = history.multiModelHistory || [];

                // 清理过期会话
                const now = Date.now();
                const validSessions = sessions.filter((s: MultiModelSession) =>
                    (now - s.timestamp) < this.SESSION_EXPIRY
                );

                validSessions.push(session);

                // 限制历史记录数量
                if (validSessions.length > this.MAX_HISTORY) {
                    validSessions.splice(0, validSessions.length - this.MAX_HISTORY);
                }

                await chrome.storage.local.set({ multiModelHistory: validSessions });
                return;
            } catch (error) {
                attempts++;
                if (attempts === this.MAX_RETRY_ATTEMPTS) {
                    console.error('保存多模型会话失败:', error);
                    throw new Error(MultiModelError.SAVE_SESSION_FAILED);
                }
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            }
        }
    }

    /**
     * 清理所有历史记录
     */
    static async clearHistory(): Promise<void> {
        await chrome.storage.local.remove(['multiModelHistory']);
    }
}

/**
 * 多模型请求处理器
 * 负责处理多模型并行请求和响应整合
 */
export class MultiModelRequestHandler {
    /**
     * 处理多模型请求
     * @param request 请求信息
     * @param models 可用的模型配置列表
     * @returns 所有模型的响应结果
     */
    static async handleMultiModelRequest(request: MultiModelChatRequest, models: ModelConfig[]): Promise<ModelResponse[]> {
        if (!request.modelIds?.length) {
            throw new Error('未选择任何模型');
        }

        if (!request.messages?.length) {
            throw new Error('消息内容不能为空');
        }

        // 并行请求所有选中的模型
        const promises = request.modelIds.map(modelId => this.handleSingleModelRequest(modelId, models, request.messages));
        const results = await Promise.allSettled(promises);

        return results
            .map(result => result.status === 'fulfilled' ? result.value : null)
            .filter((response): response is ModelResponse => response !== null);
    }

    /**
     * 处理单个模型的请求
     * @private
     */
    private static async handleSingleModelRequest(modelId: string, models: ModelConfig[], messages: ChatMessage[]): Promise<ModelResponse> {
        const model = models.find(m => m.id === modelId);
        if (!model) {
            return {
                modelId,
                modelName: '未知模型',
                status: 'error' as const,
                error: '未找到模型配置',
                timestamp: Date.now(),
                response: {
                    id: crypto.randomUUID(),
                    content: [],
                    timestamp: Date.now(),
                    isUser: false,
                    role: 'assistant'
                }
            };
        }

        let retryCount = 0;
        const maxRetries = 1;
        const retryDelay = 1000; // 1秒

        while (retryCount < maxRetries) {
            try {
                const content = await APIRequestManager.sendRequest(model, messages);
                return {
                    modelId,
                    modelName: model.name,
                    response: {
                        id: crypto.randomUUID(),
                        content: [{ type: 'text', text: content }],
                        timestamp: Date.now(),
                        isUser: false,
                        role: 'assistant'
                    },
                    status: 'success' as const,
                    timestamp: Date.now()
                };
            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    return {
                        modelId,
                        modelName: model.name,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : '请求失败',
                        timestamp: Date.now(),
                        response: {
                            id: crypto.randomUUID(),
                            content: [],
                            timestamp: Date.now(),
                            isUser: false,
                            role: 'assistant'
                        }
                    };
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        // 这里不应该被执行到，但为了 TypeScript 类型检查，我们需要返回一个值
        return {
            modelId,
            modelName: model.name,
            status: 'error' as const,
            error: '请求失败：超过最大重试次数',
            timestamp: Date.now(),
            response: {
                id: crypto.randomUUID(),
                content: [],
                timestamp: Date.now(),
                isUser: false,
                role: 'assistant'
            }
        };
    }
}