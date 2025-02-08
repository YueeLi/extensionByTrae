// 消息相关类型定义

// 处理请求类型 - 定义不同的请求处理类型
export type HandleRequestType = 'chat' | 'translate' | 'summarize' | 'analyze' | 'explain';

// 消息角色类型 - 定义消息的发送者角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息内容类型 - 支持文本、图片和文件
export type MessageContentType = 'text' | 'image_url' | 'file';

// 文件资源接口 - 用于处理图片和文件类型的消息
export interface FileResource {
    url: string;      // 资源的URL地址
    detail: string;   // 资源的详细信息
}

// 消息内容接口 - 定义单条消息的具体内容结构
export interface MessageContent {
    type: MessageContentType;      // 消息类型
    text?: string;                 // 文本内容
    image_url?: FileResource;      // 图片资源
    file?: FileResource;          // 文件资源
}

// 基础消息接口 - 定义完整的消息结构
export interface Message {
    id: string;                    // 消息唯一标识
    timestamp: number;             // 消息时间戳
    isUser: boolean;               // 是否为用户消息
    content: MessageContent[];     // 消息内容数组
    role: MessageRole;             // 消息角色
}

// 聊天消息接口 - 用于API请求的消息格式
export interface ChatMessage {
    role: MessageRole;                     // 消息角色
    content: MessageContent[];           // 消息内容，使用结构化内容
}

// 聊天请求接口 - 发送聊天请求的结构
export interface ChatRequest {
    modelId?: string;         // 可选的模型ID
    messages: ChatMessage[];  // 聊天消息列表
}

// 聊天请求体 - 发送给API的具体请求结构
export interface ChatRequestBody {
    messages: ChatMessage[];  // 聊天消息列表
    model?: string;          // 可选的模型名称
    temperature?: number;    // 温度参数
    max_tokens?: number;     // 最大token数
    stream?: boolean;        // 是否使用流式响应
}

// 消息响应接口 - API响应的消息格式
export interface MessageResponse {
    content?: string;    // 响应内容
    error?: string;      // 错误信息
}

// 处理请求接口 - 用于处理不同类型的请求
export interface HandleRequest {
    type: HandleRequestType;       // 请求类型
    content: MessageContent[];     // 请求内容
}