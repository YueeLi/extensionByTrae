import { Message, MessageContent } from '../types/types';

export class MessageFactory {
    static createMessage(role: 'user' | 'assistant' | 'system', content: MessageContent[]): Message {
        return {
            role,
            content,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            isUser: role === 'user',
            isReasoning: false
        };
    }

    static createUserMessage(content: MessageContent[]): Message {
        return this.createMessage('user', content);
    }

    static createAssistantMessage(content: MessageContent[], reasoning_content?: MessageContent): Message {
        const message = this.createMessage('assistant', content);
        if (reasoning_content) {
            message.isReasoning = true;
            message.reasoning_content = reasoning_content;
        }
        return message;
    }
}