import { Settings, Message, StreamChunkResponse, ChatRequest, ModelRequestConfig, MessageContent, HandleRequest } from '../types';

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
        try {
            const history = await chrome.storage.local.get(['chatHistory']);
            const chatHistory = history.chatHistory || [];

            chatHistory.push(userMessage, assistantMessage);

            if (chatHistory.length > 30) {
                chatHistory.splice(0, chatHistory.length - 30);
            }

            await chrome.storage.local.set({ chatHistory });
        } catch (error) {
            console.error('更新聊天历史失败:', error);
            throw new Error('更新聊天历史记录失败');
        }
    }

    static async clearHistory() {
        await chrome.storage.local.remove(['chatHistory']);
    }
}

// 消息工厂
class MessageFactory {
    static createMessage(role: 'user' | 'assistant' | 'system', content: MessageContent[]): Message {
        return {
            role,
            content,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            isUser: role === 'user'
        };
    }

    static createUserMessage(content: MessageContent[]): Message {
        return this.createMessage('user', content);
    }

    static createAssistantMessage(content: MessageContent[]): Message {
        return this.createMessage('assistant', content);
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
            buildUrl: (model) => `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
            buildHeaders: (model) => ({
                'Content-Type': 'application/json',
                'api-key': model.apiKey,
                ...model.requestConfig?.headers
            }),
            buildBody: (messages, model) => ({
                messages,
                model: model.model,
                max_completion_tokens: model.max_completion_tokens || 4096,
                temperature: model.temperature || 1.0, // o1-mini must be 1.0
                stream: model.stream || false,
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

        if (!info?.messages?.length) {
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
            const requestBody = modelConfig.buildBody(info.messages, selectedModel);

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

            const result = await response.json();
            if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
                throw new Error('API响应格式无效');
            }
            const choice = result.choices[0];
            if (!choice.message || typeof choice.message.content !== 'string') {
                throw new Error('API响应内容格式无效');
            }
            return choice.message.content;

        } catch (error) {
            console.error('API调用出错:', error);
            throw error;
        }
    }
}

// 请求处理器
class RequestHandler {
    static async handleAzureOpenAIRequest(userMessage: Message): Promise<string> {
        console.log('chatRequest with history:', userMessage);
        const chatRequest: ChatRequest = {
            messages: [{
                role: userMessage.role,
                content: userMessage.content
            }]
        };

        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const response = await APIManager.callAzureOpenAI(chatRequest);

                // 创建助手消息对象
                const assistantMessage = MessageFactory.createAssistantMessage([{
                    type: 'text',
                    text: response
                }]);

                // 更新聊天历史
                await HistoryManager.updateHistory(userMessage, assistantMessage);

                return response;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw error;
                }
                // 指数退避重试
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
        }

        throw new Error('请求失败，已达到最大重试次数');
    }

    static async handleRequest(msg: HandleRequest): Promise<string> {
        let content = msg.content;
        const textContent = content.find(item => item.type === 'text')?.text || '';

        if (msg.type === 'translate') {
            content = [{
                type: 'text',
                text: `请将以下内容翻译成中文，保持原文的语气和风格：\n\n${textContent}`
            }];
        }
        if (msg.type === 'analyze') {
            content = [{
                type: 'text',
                text: `请分析以下内容，包括主要观点、论据支持、逻辑结构等方面：\n\n${textContent}`
            }];
        }
        if (msg.type === 'explain') {
            content = [{
                type: 'text',
                text: `请详细解释以下内容，使用通俗易懂的语言，并举例说明：\n\n${textContent}`
            }];
        }
        if (msg.type === 'summarize') {
            content = [{
                type: 'text',
                text: `请总结以下内容的要点，突出关键信息：\n\n${textContent}`
            }];
        }

        const userMessage = MessageFactory.createUserMessage(content);
        return this.handleAzureOpenAIRequest(userMessage);
    }
}

chrome.runtime.onMessage.addListener((message: HandleRequest, _sender, sendResponse) => {
    if (!message.type) {
        console.error('Message type not specified');
        sendResponse({ error: '消息类型未指定' });
        return false;
    }

    // 处理异步消息
    (async () => {
        try {
            const response = await RequestHandler.handleRequest(message);
            sendResponse({ content: response });
        } catch (error) {
            console.error('处理消息时出错:', error);
            sendResponse({
                error: error instanceof Error ? error.message : '处理消息时发生未知错误'
            });
        }
    })();

    // 返回true表示将异步处理响应
    return true;
});
