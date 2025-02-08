import { Message, MessageContent } from '../types/types';

export class MessageFactory {
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