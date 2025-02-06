import { Settings, Message, FileContent, StreamChunkResponse, ChatRequest, ModelRequestConfig, MessageContent, MessageRequest } from '../types';

// 配置侧边栏行为，使点击扩展图标时打开侧边栏，不可删除！！！
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 事件监听器，不要动！！！
chrome.runtime.onStartup.addListener(() => {
    HistoryManager.clearHistory();
});

chrome.runtime.onInstalled.addListener(() => {
    HistoryManager.clearHistory();
});

// 设置管理
class SettingsManager {
    static async getSettings(): Promise<Settings> {
        const result = await chrome.storage.sync.get(['models', 'defaultModelId']);
        console.log('models settings:', result);
        if (!result.models?.length) {
            throw new Error('请先在设置页面添加模型配置');
        }
        if (!result.defaultModelId) {
            throw new Error('请先在设置页面选择默认模型');
        }
        const defaultModel = result.models.find((m: { id: string }) => m.id === result.defaultModelId);
        if (!defaultModel) {
            throw new Error('未找到默认模型配置');
        }
        if (!defaultModel.apiKey) {
            throw new Error('默认模型的API密钥未配置');
        }
        if (!defaultModel.endpoint) {
            throw new Error('默认模型的API端点未配置');
        }
        return {
            models: result.models,
            defaultModelId: result.defaultModelId,
            defaultModel: defaultModel
        };
    }
}

// 历史记录管理
class HistoryManager {
    static async updateHistory(userMessage: Message, assistantMessage: Message) {
        const history = await chrome.storage.local.get(['chatHistory']);
        const chatHistory = history.chatHistory || [];

        chatHistory.push(userMessage, assistantMessage);

        if (chatHistory.length > 30) {
            chatHistory.splice(0, chatHistory.length - 30);
        }

        await chrome.storage.local.set({ chatHistory });
    }

    static async clearHistory() {
        await chrome.storage.local.remove(['chatHistory']);
    }
}

// 消息工厂
class MessageFactory {
    static createMessage(role: 'user' | 'assistant' | 'system', text: string, fileContent?: FileContent): Message {
        const content: any[] = [];
        if (fileContent) {
            content.push(fileContent);
        }
        content.push({
            type: 'text',
            text: text
        });
        return {
            role,
            content,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            isUser: role === 'user'
        };
    }

    static createSystemMessage(): Message {
        return this.createMessage('system', 'You are a helpful assistant.');
    }

    static createUserMessage(text: string, file?: File | null): Message {
        if (!file) {
            return this.createMessage('user', text);
        }

        const fileContent: FileContent = {
            type: file.type === 'image' ? 'image_url' : 'file'
        };

        if (file.type === 'image') {
            fileContent.image_url = {
                url: URL.createObjectURL(file),
                detail: 'low'
            };
        } else {
            fileContent.file = {
                url: URL.createObjectURL(file),
                detail: 'low'
            };
        }

        return this.createMessage('user', text, fileContent);
    }

    static createAssistantMessage(text: string): Message {
        return this.createMessage('assistant', text);
    }
}

// API调用管理
class APIManager {
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
                model: model.model,
                max_completion_tokens: 4096,
                temperature: 0.7,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop: null,
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
                model: model.model,
                max_completion_tokens: 4096,
                ...model.requestConfig?.bodyTemplate
            })
        },
        'deepseek': {
            buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.model,
                max_tokens: 4096,
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
                model: model.model,
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
                model: model.model,
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
                model: model.model,
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
            return { content, done: false };
        } catch (e) {
            console.error('解析响应数据失败:', e);
            return { content: '', done: false };
        }
    }

    static async callAzureOpenAI(info: ChatRequest): Promise<string> {
        console.log('request LLM with ChatRequest:', info)

        if (!info?.content?.length) {
            throw new Error('输入内容不能为空');
        }

        const settings = await SettingsManager.getSettings();
        const { models } = settings;
        const defaultModelId = (await chrome.storage.sync.get(['defaultModelId'])).defaultModelId;

        const selectedModel = defaultModelId ? models.find(m => m.id === defaultModelId) : models[0];

        if (!selectedModel) {
            throw new Error('未找到指定的模型配置');
        }

        const messages = [];
        messages.push({
            role: 'user',
            content: info.content,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            isUser: true
        });

        try {
            const modelConfig = this.MODEL_CONFIGS[selectedModel.model];
            if (!modelConfig) {
                throw new Error(`不支持的模型类型: ${selectedModel.model}`);
            }

            const url = modelConfig.buildUrl(selectedModel);
            const headers = modelConfig.buildHeaders(selectedModel);
            const requestBody = {
                ...modelConfig.buildBody(messages, selectedModel),
                stream: info.useStream ?? false
            };

            console.log('request LLM with requestBody:', requestBody);

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            if (!info.useStream) {
                const result = await response.json();
                return result.choices[0]?.message?.content || '';
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('无法获取响应流');
            }

            let fullText = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const { content, done } = await this.processStreamChunk(line.slice(6));
                        if (done) continue;
                        fullText += content;
                    }
                }
            }

            if (!fullText) {
                throw new Error('API返回的响应内容无效');
            }

            return fullText;
        } catch (error) {
            console.error('API调用出错:', error);
            throw error;
        }
    }
}

// 请求处理器
class RequestHandler {
    static async handleAzureOpenAIRequest(userMessage: Message, useStream?: boolean): Promise<string> {
        console.log('chatRequest with history:', userMessage);
        const chatRequest: ChatRequest = {
            content: userMessage.content,
            useStream: useStream
        };
        const response = await APIManager.callAzureOpenAI(chatRequest);
        const assistantMessage = MessageFactory.createAssistantMessage(response);
        await HistoryManager.updateHistory(userMessage, assistantMessage);
        return response;
    }

    static async handleChatRequest(text: string, files: File | null): Promise<string> {
        const userMessage = MessageFactory.createUserMessage(text, files);
        return this.handleAzureOpenAIRequest(userMessage);
    }

    static async handleTranslateRequest(text: string): Promise<string> {
        const userMessage = MessageFactory.createUserMessage(`请将以下内容翻译成中文 :\n${text}`);
        return this.handleAzureOpenAIRequest(userMessage);
    }

    static async handleSummarizeRequest(text: string): Promise<string> {
        const userMessage = MessageFactory.createUserMessage(`请总结以下内容的要点：\n${text}`);
        return this.handleAzureOpenAIRequest(userMessage);
    }

    static async handleAnalyzeRequest(text: string): Promise<string> {
        const userMessage = MessageFactory.createUserMessage(`请分析以下内容并提供见解：\n${text}`);
        return this.handleAzureOpenAIRequest(userMessage);
    }

    static async handleExplainRequest(text: string): Promise<string> {
        const userMessage = MessageFactory.createUserMessage(`请解释以下信息：\n${text}`);
        return this.handleAzureOpenAIRequest(userMessage);
    }
}

chrome.runtime.onMessage.addListener((message: MessageRequest, _sender, sendResponse) => {
    if (!message.type) {
        console.error('Message type not specified');
        sendResponse({ error: '消息类型未指定' });
        return false;
    }

    const messageHandlers = {
        chat: () => RequestHandler.handleChatRequest(message.text, message.files || null),
        translate: () => RequestHandler.handleTranslateRequest(message.text),
        summarize: () => RequestHandler.handleSummarizeRequest(message.text),
        analyze: () => RequestHandler.handleAnalyzeRequest(message.text),
        explain: () => RequestHandler.handleExplainRequest(message.text)
    };

    const handler = messageHandlers[message.type];
    if (!handler) {
        console.error('Unsupported message type:', message.type);
        sendResponse({ error: '不支持的消息类型' });
        return false;
    }

    handler()
        .then(response => {
            console.log('Handler response:', response);
            sendResponse(response);
        })
        .catch(error => {
            console.error('Handler error:', error);
            sendResponse({ error: error instanceof Error ? error.message : '处理请求失败' });
        });

    return true;
});
