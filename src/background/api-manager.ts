import { ModelConfig, ChatRequest } from '../types/model';
import { ChatMessage } from '../types/message';
import { SettingsManager } from './index';
import { ModelConfigManager } from './model-config-manager';
import { APIRequestManager } from './api-request-manager';

/**
 * API管理器
 * 负责协调模型配置和API请求的处理
 */
export class APIManager {
    /**
     * 调用Azure OpenAI API
     * @param info 聊天请求信息
     * @returns 响应内容
     * @throws Error 当请求失败时抛出错误
     */
    static async callAzureOpenAI(info: ChatRequest): Promise<string> {
        if (!info?.messages?.length) {
            throw new Error('输入内容不能为空');
        }

        const settings = await SettingsManager.getSettings();
        const selectedModel = settings.defaultModel;

        if (!selectedModel) {
            throw new Error('未找到指定的模型配置');
        }

        // 验证模型配置
        ModelConfigManager.validateModelConfig(selectedModel);

        try {
            return await APIRequestManager.sendRequest(selectedModel, info.messages);
        } catch (error) {
            console.error('API调用出错:', error);
            throw error;
        }
    }

    /**
     * 处理流式响应数据
     */
    static processStreamChunk(chunk: string) {
        return APIRequestManager.processStreamChunk(chunk);
    }
}