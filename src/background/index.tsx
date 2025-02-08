import { HandleRequest, Message, ChatMessage, ChatRequest } from '../types/types';
import { HistoryManager } from './history';
import { MessageFactory } from './message';
import { APIManager } from './api';

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

// 请求处理器
class RequestHandler {
    static async handleAzureOpenAIRequest(userMessage: Message): Promise<string> {
        console.log('chatRequest with history:', userMessage);

        const chatMsg: ChatMessage = {
            role: 'user',
            content: userMessage.content
        };

        const chatRequest: ChatRequest = {
            messages: []
        };

        // 获取历史对话记录
        const history = await chrome.storage.local.get(['chatHistory']);
        const chatHistory = history.chatHistory || [];
        // 遍历历史记录，将用户和助手的消息成对添加到chatRequest.messages中
        for (let i = 0; i < chatHistory.length; i += 2) {
            const userMsg = chatHistory[i];
            const assistantMsg = chatHistory[i + 1];
            if (userMsg && assistantMsg) {
                chatRequest.messages.push({
                    role: 'user',
                    content: userMsg.content
                });
                chatRequest.messages.push({
                    role: 'assistant',
                    content: assistantMsg.content
                });
            }
        }

        // 添加最新的用户消息
        chatRequest.messages.push(chatMsg);

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
