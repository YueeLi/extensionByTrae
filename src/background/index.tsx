import { Settings } from '../types/model';
import { Message, MessageContent, HandleRequestType, ChatRequest } from '../types/message';
import { APIManager } from './api-manager';
import { MultiModelRequestHandler } from './multi-model';

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
export class SettingsManager {
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



// 请求处理器
class RequestHandler {
    static async handleAzureOpenAIRequest(userMessage: Message): Promise<string> {
        console.log('chatRequest with history:', userMessage);
        const chatRequest: ChatRequest = {
            messages: [{
                role: userMessage.role,
                content: userMessage.content.find(item => item.type === 'text')?.text || ''
            }]
        };

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
            console.error('API请求失败:', error);
            throw error;
        }
    }

    static async handleRequest(msg: { type: HandleRequestType; content: MessageContent[] }): Promise<string> {
        // 确保content是数组
        let content = Array.isArray(msg.content) ? msg.content : [msg.content].filter(Boolean);
        const textContent = content.find(item => item?.type === 'text')?.text || '';

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

chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    if (!message.type) {
        console.error('Message type not specified');
        sendResponse({ error: '消息类型未指定' });
        return false;
    }

    // 处理异步消息
    (async () => {
        try {
            if (message.type === 'multiModelChat') {
                // 获取模型配置
                const settings = await SettingsManager.getSettings();
                const { models } = settings;

                // 处理多模型请求
                const responses = await MultiModelRequestHandler.handleMultiModelRequest({
                    sessionId: crypto.randomUUID(),
                    modelIds: message.modelIds,
                    messages: [{
                        role: 'user',
                        content: message.content
                    }]
                }, models);

                // 返回响应结果
                sendResponse({
                    sessionId: message.sessionId,
                    modelResponses: responses,
                    timestamp: Date.now(),
                    selectedModels: message.modelIds
                });
            } else {
                const response = await RequestHandler.handleRequest(message);
                sendResponse({ content: response });
            }
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
