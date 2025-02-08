import { ModelConfig, ModelRequestConfig } from '../types/model';
import { ChatMessage } from '../types/message';

/**
 * 模型配置管理器
 * 负责管理所有支持的模型配置和请求构建逻辑
 */
export class ModelConfigManager {
    private static readonly MODEL_CONFIGS: Record<string, ModelRequestConfig> = {
        'gpt-4o': {
            buildUrl: (model: ModelConfig) =>
                `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
            buildHeaders: (model: ModelConfig) => ({
                'Content-Type': 'application/json',
                'api-key': model.apiKey,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages: ChatMessage[], model: ModelConfig) => ({
                messages,
                model: model.model,
                max_tokens: model.max_tokens || 4096,
                temperature: model.temperature || 0.7,
                top_p: model.top_p || 0.95,
                frequency_penalty: model.frequency_penalty || 0,
                presence_penalty: model.presence_penalty || 0,
                stop: model.stop || null,
                stream: model.stream || false,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'o1-mini': {
            buildUrl: (model: ModelConfig) =>
                `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
            buildHeaders: (model: ModelConfig) => ({
                'Content-Type': 'application/json',
                'api-key': model.apiKey,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages: ChatMessage[], model: ModelConfig) => ({
                messages,
                model: model.model,
                max_completion_tokens: model.max_completion_tokens || 4096,
                temperature: model.temperature || 1.0,
                stream: model.stream || false,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'deepseek': this.createOpenAICompatibleConfig(),
        'llama3': this.createOpenAICompatibleConfig(),
        'qwen2': this.createOpenAICompatibleConfig(),
        'claude': {
            buildUrl: (model: ModelConfig) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model: ModelConfig) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                'anthropic-version': '2023-06-01',
                ...model.requestConfig?.headers
            }),
            buildBody: (messages: ChatMessage[], model: ModelConfig) => ({
                messages,
                model: model.model,
                max_tokens: 4096,
                temperature: 0.7,
                ...model.requestConfig?.bodyTemplate
            })
        }
    };

    /**
     * 创建OpenAI兼容的API配置
     * 用于那些遵循OpenAI API规范的模型服务
     */
    private static createOpenAICompatibleConfig(): ModelRequestConfig {
        return {
            buildUrl: (model: ModelConfig) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model: ModelConfig) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages: ChatMessage[], model: ModelConfig) => ({
                messages,
                model: model.model,
                max_tokens: 4096,
                temperature: 0.7,
                ...model.requestConfig?.bodyTemplate
            })
        };
    }

    /**
     * 获取指定模型的配置
     * @param modelType 模型类型
     * @throws Error 当模型类型不支持时抛出错误
     */
    static getModelConfig(modelType: string): ModelRequestConfig {
        const config = this.MODEL_CONFIGS[modelType];
        if (!config) {
            throw new Error(`不支持的模型类型: ${modelType}`);
        }
        return config;
    }

    /**
     * 验证模型配置的有效性
     * @param model 模型配置
     * @throws Error 当配置无效时抛出错误
     */
    static validateModelConfig(model: ModelConfig): void {
        if (!model.model || !this.MODEL_CONFIGS[model.model]) {
            throw new Error(`不支持的模型类型: ${model.model || '未指定'}`);
        }

        if (!model.apiKey?.trim()) {
            throw new Error('API密钥不能为空');
        }

        if (!model.endpoint?.trim()) {
            throw new Error('API端点不能为空');
        }

        if (model.apiFormat === 'azure' && !model.deploymentName?.trim()) {
            throw new Error('Azure部署名称不能为空');
        }
    }
}