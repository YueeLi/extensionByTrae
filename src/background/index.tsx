import { HandleExtensionRequest, Message, LLMRequestMessage } from '../types/types';

import { MessageFactory } from './message';
import { SessionManager } from './session';
import { APIManager } from './api';

// 配置侧边栏行为，使点击扩展图标时打开侧边栏，不可删除！！！
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 通用重试机制
class RetryManager {
    private static readonly MAX_RETRIES = 3;
    private static readonly BASE_DELAY = 1000; // 1秒

    static async withRetry<T>(operation: () => Promise<T>, errorHandler?: (error: Error) => void): Promise<T> {
        let retryCount = 0;

        while (retryCount < this.MAX_RETRIES) {
            try {
                return await operation();
            } catch (error) {
                retryCount++;
                if (errorHandler && error instanceof Error) {
                    errorHandler(error);
                }
                if (retryCount === this.MAX_RETRIES) {
                    throw error;
                }
                // 指数退避重试
                await new Promise(resolve =>
                    setTimeout(resolve, Math.pow(2, retryCount) * this.BASE_DELAY)
                );
            }
        }

        throw new Error('请求失败，已达到最大重试次数');
    }
}

// 统一消息处理中心
class MessageCenter {
    private static readonly MESSAGE_TEMPLATES = {
        translate: (text: string) => `请将以下内容翻译成中文，保持原文的语气和风格：\n\n${text}`,
        analyze: (text: string) => `请分析以下内容，包括主要观点、论据支持、逻辑结构等方面：\n\n${text}`,
        explain: (text: string) => `请详细解释以下内容，使用通俗易懂的语言，并举例说明：\n\n${text}`,
        summarize: (text: string) => `请总结以下内容的要点，突出关键信息：\n\n${text}`
    };

    static validateMessage(message: any): message is HandleExtensionRequest {
        return message && typeof message.type === 'string' && Array.isArray(message.content);
    }

    static async handleChatRequest(userMessage: Message): Promise<string> {
        const newMsg: LLMRequestMessage = {
            role: 'user',
            content: userMessage.content
        };

        const currentSessionID = await SessionManager.getCurrentSessionID();
        if (!currentSessionID) {
            throw new Error('未找到当前会话');
        }

        const sessionMessages = await SessionManager.getSessionMessages(currentSessionID);
        const reqMessages: LLMRequestMessage[] = [];

        // 构建历史消息
        for (let i = 0; i < sessionMessages.length; i += 2) {
            const [userMsg, assistantMsg] = [sessionMessages[i], sessionMessages[i + 1]];
            if (userMsg && assistantMsg) {
                reqMessages.push(
                    { role: 'user', content: userMsg.content },
                    { role: 'assistant', content: assistantMsg.content }
                );
            }
        }
        reqMessages.push(newMsg);

        return RetryManager.withRetry(async () => {
            const response = await APIManager.callAzureOpenAI(reqMessages);
            const assistantMessage = MessageFactory.createAssistantMessage([{
                type: 'text',
                text: response
            }]);
            await SessionManager.updateSession(currentSessionID, userMessage);
            await SessionManager.updateSession(currentSessionID, assistantMessage);
            return response;
        });
    }

    static async handleRequest(message: HandleExtensionRequest): Promise<string> {
        // 区分聊天类型和其他类型的消息
        if (message.type === 'chat') {
            // 直接处理聊天消息，支持多媒体内容
            const userMessage = MessageFactory.createUserMessage(message.content);
            return this.handleChatRequest(userMessage);
        }

        // 处理其他类型的消息（翻译、分析、解释、总结等）
        const textContent = message.content.find(item => item.type === 'text')?.text || '';
        const template = this.MESSAGE_TEMPLATES[message.type as keyof typeof this.MESSAGE_TEMPLATES];

        if (!textContent) {
            throw new Error('无效的文本内容');
        }

        const userMessage = MessageFactory.createUserMessage([{ type: 'text' as const, text: template ? template(textContent) : textContent }]);
        return this.handleChatRequest(userMessage);
    }
}

// 统一消息监听器
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    if (MessageCenter.validateMessage(message)) {
        // 处理聊天相关请求
        (async () => {
            try {
                const response = await MessageCenter.handleRequest(message);
                sendResponse({ content: response });
            } catch (error) {
                console.error('处理消息时出错:', error);
                sendResponse({
                    error: error instanceof Error ? error.message : '处理消息时发生未知错误'
                });
            }
        })();
        return true;
    }

    // 处理会话相关请求
    if (message.type && typeof message.type === 'string') {
        (async () => {
            try {
                const result = await SessionManager.handleSessionRequest(message.type, message);
                console.log('Sending session response:', result);
                sendResponse(result);
            } catch (error) {
                console.error('Session operation error:', error);
                sendResponse({ error: error instanceof Error ? error.message : '操作失败' });
            }
        })();
        return true;
    }

    return false;
});