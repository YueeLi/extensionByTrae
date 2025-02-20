import { HandleExtensionRequest, LLMRequestMessage } from '../types/types';

import { MessageFactory } from './message';
import { SessionManager } from './session';
import { AIModelManager } from './model';
import { MessageContent } from '../types/types';

// 配置侧边栏行为，使点击扩展图标时打开侧边栏，不可删除！！！
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// 统一消息处理中心
class MessageCenter {
    private static readonly MESSAGE_TEMPLATES = {
        translate: (text: string) => `请将以下内容翻译成中文，保持原文的语气和风格：\n\n${text}`,
        analyze: (text: string) => `请分析以下内容，包括主要观点、论据支持、逻辑结构等方面：\n\n${text}`,
        explain: (text: string) => `请详细解释以下内容，使用通俗易懂的语言，并举例说明：\n\n${text}`,
        summarize: (text: string) => `请总结以下内容的要点，突出关键信息：\n\n${text}`
    }

    // 处理聊天请求, 并返回处理结果.涉及历史消息及session操作.
    static async handleChatRequest(operate: string, content: MessageContent[]): Promise<string> {

        const userMessage = MessageFactory.createUserMessage(content || []);
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
        console.log('chat request to LLM:', reqMessages);
        const response = await AIModelManager.callAzureAI(reqMessages);
        const assistantMessage = MessageFactory.createAssistantMessage([{
            type: 'text',
            text: response
        }]);
        await SessionManager.updateSession(currentSessionID, userMessage);
        await SessionManager.updateSession(currentSessionID, assistantMessage);
        return response;
    }

    // 处理content相关请求, 如翻译、分析、解释、总结等, 并返回处理结果.不涉及历史消息及session操作.
    static async handleContentRequest(operate: string, content: MessageContent[]): Promise<string> {
        const textContent = content?.find(item => item.type === 'text')?.text || '';
        const template = this.MESSAGE_TEMPLATES[operate as keyof typeof this.MESSAGE_TEMPLATES];
        if (!textContent) {
            throw new Error('无效的文本内容');
        }
        const userMessage = MessageFactory.createUserMessage([{ type: 'text' as const, text: template ? template(textContent) : textContent }]);
        const newMsg: LLMRequestMessage = {
            role: 'user',
            content: userMessage.content
        };

        const reqMessages: LLMRequestMessage[] = newMsg ? [newMsg] : [];
        const response = await AIModelManager.callAzureAI(reqMessages);
        return response;
    }
}

// 统一消息监听器
chrome.runtime.onMessage.addListener((message: HandleExtensionRequest, _sender, sendResponse) => {
    // 处理聊天请求
    if (message.type === 'chat') {
        (async () => {
            try {
                const response = await MessageCenter.handleChatRequest(message.operate, message.content ?? []);
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

    // 处理content相关请求
    if (message.type === 'content') {
        (async () => {
            try {
                const result = await MessageCenter.handleContentRequest(message.operate, message.content ?? []);
                sendResponse({ content: result });
            } catch (error) {
                console.error('Content operation error:', error);
                sendResponse({ error: error instanceof Error ? error.message : '操作失败' });
            }
        })();
        return true;
    }

    // 处理会话相关请求
    if (message.type === 'session') {
        (async () => {
            try {
                const result = await SessionManager.handleSessionRequest(message.operate, message.session ?? null);
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