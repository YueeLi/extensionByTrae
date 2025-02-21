import { LLMRequestMessage, ModelRequestConfig, StreamChunkResponse } from '../types/types';
import { SettingsManager } from './settings';

export class AIModelManager {
    private static readonly MODEL_CONFIGS: Record<string, ModelRequestConfig> = {
        'gpt-4o': {
            buildUrl: (model) => `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'api-key': model.apiKey,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_tokens: model.max_tokens || 4096,
                temperature: model.temperature || 0.7,
                top_p: model.top_p || 0.95,
                stream: model.stream || false,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'o1-mini': {
            buildUrl: (model) => `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'api-key': model.apiKey,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_completion_tokens: model.max_completion_tokens || 4096,
                temperature: model.temperature || 1.0,
                stream: model.stream || false,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'DeepSeek-R1': {
            buildUrl: (model) => `${model.endpoint}/api/v3/chat/completions`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_tokens: model.max_tokens || 4096,
                stream: model.stream || false,
                reasoning: model.reasoning || false,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'llama3': {
            buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_tokens: 4096,
                temperature: 0.7,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'claude': {
            buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                'anthropic-version': '2023-06-01',
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_tokens: 4096,
                temperature: 0.7,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'qwen2': {
            buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.deploymentName,
                max_tokens: 4096,
                temperature: 0.7,
                ...model.requestConfig?.bodyTemplate
            })
        }
    };

    static async processStreamChunk(chunk: string): Promise<StreamChunkResponse> {
        if (chunk === '[DONE]') {
            return { content: '', done: true };
        }

        try {
            const parsed = JSON.parse(chunk);
            const content = parsed.choices?.[0]?.delta?.content || '';
            const reasoning_content = parsed.choices?.[0]?.delta?.reasoning_content || '';
            return { content, reasoning_content, done: false };
        } catch (e) {
            console.error('解析响应数据失败:', e);
            return { content: '', done: false };
        }
    }



    static async callAzureAI(info: LLMRequestMessage[], port?: chrome.runtime.Port): Promise<{ response_content: string; reasoning_content?: string }> {
        console.log('request LLM with ChatRequest:', info)

        if (!info?.length) {
            throw new Error('输入内容不能为空');
        }

        const settings = await SettingsManager.getSettings();
        const selectedModel = settings.defaultModel;

        if (!selectedModel) {
            throw new Error('未找到指定的模型配置');
        }

        try {
            const modelConfig = this.MODEL_CONFIGS[selectedModel.model];
            if (!modelConfig) {
                throw new Error(`不支持的模型类型: ${selectedModel.model}`);
            }

            const url = modelConfig.buildUrl(selectedModel);
            const headers = modelConfig.buildHeaders(selectedModel);
            const requestBody = modelConfig.buildBody(info, { ...selectedModel, stream: !!port });

            console.log('request LLM with requestBody:', requestBody);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const statusCode = response.status;

                // 细分错误类型
                if (statusCode === 429) {
                    throw new Error('API请求过于频繁，请稍后重试');
                } else if (statusCode === 401 || statusCode === 403) {
                    throw new Error('API认证失败，请检查密钥是否正确');
                } else if (statusCode >= 500) {
                    throw new Error('API服务器错误，请稍后重试');
                }

                throw new Error(`API调用失败: ${statusCode} ${errorData.error?.message || response.statusText}`);
            }

            // 如果提供了port参数，使用流式响应
            if (port) {
                const reader = response.body!.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                let fullReasoning = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n').filter(line => line.trim() !== '');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const { content, reasoning_content, done } = await this.processStreamChunk(data);
                                    if (content) {
                                        fullResponse += content;
                                        port.postMessage({ type: 'CHUNK', data: content });
                                    }
                                    if (reasoning_content) {
                                        fullReasoning += reasoning_content;
                                        port.postMessage({ type: 'REASONING', data: reasoning_content });
                                    }
                                    if (done) break;
                                } catch (e) {
                                    console.error('处理数据块时出错:', e);
                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                    port.postMessage({ type: 'DONE' });
                }

                return { response_content: fullResponse, reasoning_content: fullReasoning || undefined };
            }

            // 非流式响应处理
            const result = await response.json();
            if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
                throw new Error('API响应格式无效');
            }
            const choice = result.choices[0];
            if (!choice.message || typeof choice.message.content !== 'string') {
                throw new Error('API响应内容格式无效');
            }
            return { response_content: choice.message.content };
        } catch (error) {
            console.error('API调用出错:', error);
            if (port) {
                port.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : '未知错误' });
            }
            throw error;
        }
    }
}