import { Message } from '../types/types';

export class HistoryManager {
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