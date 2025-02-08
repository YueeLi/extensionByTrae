// 多模型会话相关类型定义

import { Message, ChatMessage } from './message';

// 模型响应状态 - 定义模型响应的当前状态
export type ModelResponseStatus = 'pending' | 'success' | 'error';

// 单个模型的响应 - 包含模型回答的完整信息
export interface ModelResponse {
    modelId: string;           // 模型的唯一标识
    modelName: string;         // 模型的显示名称
    response: Message;         // 模型的回答内容
    status: ModelResponseStatus; // 响应状态
    error?: string;           // 错误信息（如果有）
    timestamp: number;        // 响应时间戳
}

// 多模型会话 - 管理多个模型对同一问题的回答
export interface MultiModelSession {
    sessionId: string;         // 会话的唯一标识
    question: Message;         // 用户的原始问题
    modelResponses: ModelResponse[]; // 所有模型的响应列表
    timestamp: number;        // 会话创建时间戳
    selectedModels: string[]; // 用户选择的模型ID列表
}

// 多模型聊天请求 - 向多个模型发送的聊天请求
export interface MultiModelChatRequest {
    sessionId: string;        // 会话的唯一标识
    modelIds: string[];      // 目标模型ID列表
    messages: ChatMessage[]; // 聊天消息历史
}

// 多模型聊天响应 - 单个模型的聊天响应
export interface MultiModelChatResponse {
    sessionId: string;       // 会话的唯一标识
    modelId: string;        // 响应模型的ID
    content: string;        // 响应内容
    error?: string;         // 错误信息（如果有）
}