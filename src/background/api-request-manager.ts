import { ModelConfig } from '../types/model';
import { ChatMessage } from '../types/message';
import { ModelConfigManager } from './model-config-manager';

/**
 * API请求管理器
 * 负责处理所有模型的API请求，包括重试、超时控制和错误处理
 */
export class APIRequestManager {
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAY = 1000; // 1秒
    private static readonly REQUEST_TIMEOUT = 30000; // 30秒

    /**
     * 发送API请求
     * @param model 模型配置
     * @param messages 聊天消息
     * @returns 响应内容
     * @throws Error 当请求失败时抛出错误
     */
    static async sendRequest(model: ModelConfig, messages: ChatMessage[]): Promise<string> {
        try {
            const response = await this.executeRequest(model, messages);
            return response;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    /**
     * 执行单次请求
     * @private
     */
    private static async executeRequest(model: ModelConfig, messages: ChatMessage[]): Promise<string> {
        const modelConfig = ModelConfigManager.getModelConfig(model.model);
        const url = modelConfig.buildUrl(model);
        const headers = modelConfig.buildHeaders(model);
        const requestBody = modelConfig.buildBody(messages, model);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            const result = await response.json();
            if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
                throw new Error('API响应格式无效');
            }

            const choice = result.choices[0];
            if (!choice.message || !choice.message.content) {
                throw new Error('API响应内容格式无效');
            }

            return JSON.stringify([{
                type: 'text',
                text: choice.message.content
            }]);

        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * 判断是否应该重试请求
     * @private
     */
    private static shouldRetry(error: any): boolean {
        // 网络错误、超时错误或特定HTTP状态码（429、503等）时进行重试
        if (error instanceof TypeError || error.name === 'AbortError') {
            return true;
        }

        if (error instanceof Error && typeof error.message === 'string') {
            const status = error.message.match(/API调用失败: (\d+)/);
            if (status) {
                const statusCode = parseInt(status[1]);
                return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
            }
        }

        return false;
    }

    /**
     * 延迟执行
     * @private
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 处理流式响应数据
     */
    static processStreamChunk(chunk: string): { content: string; done: boolean } {
        if (chunk === '[DONE]') {
            return { content: JSON.stringify([{ type: 'text', text: '' }]), done: true };
        }

        try {
            const parsed = JSON.parse(chunk);
            const text = parsed.choices?.[0]?.delta?.content || '';
            return { content: JSON.stringify([{ type: 'text', text }]), done: false };
        } catch (e) {
            console.error('解析响应数据失败:', e);
            return { content: JSON.stringify([{ type: 'text', text: '' }]), done: false };
        }
    }
}