// Model详细定义
export interface ModelConfig {
    // 基础配置
    id: string;  // 模型配置的唯一标识
    name: string;  // 模型配置的显示名称
    model: string;  // 模型名称
    apiFormat: 'azure' | 'openai' | 'custom';  // API格式

    // API配置
    deploymentName: string;  // Azure部署名称
    apiVersion: string;  // API版本
    apiKey: string;  // API密钥
    endpoint: string;  // API端点
    apiPath?: string;  // 自定义API路径（仅custom格式需要）
    requestConfig?: {  // 自定义请求配置
        headers?: Record<string, string>;  // 自定义请求头
        params?: Record<string, string>;  // 自定义URL参数
        bodyTemplate?: Record<string, any>;  // 自定义请求体模板
    };

    // 模型参数配置
    temperature?: number;  // 控制输出的随机性 (0-1)
    max_tokens?: number;  // 生成文本的最大长度
    max_completion_tokens?: number;  // 补全文本的最大长度
    top_p?: number;  // 控制输出的多样性 (0-1)
    frequency_penalty?: number;  // 控制重复词汇的惩罚程度 (-2.0-2.0)
    presence_penalty?: number;  // 控制话题重复的惩罚程度 (-2.0-2.0)
    stop?: string[] | null;  // 停止生成的标记
    stream?: boolean;  // 是否启用流式响应
}

// 请求体封装
export interface ModelRequestConfig {
    buildUrl: (model: ModelConfig) => string;
    buildHeaders: (model: ModelConfig) => Record<string, string>;
    buildBody: (messages: LLMRequestMessage[], model: ModelConfig) => LLMRequestFullBody;  // 简化参数类型
}

// 设置相关接口
export interface Settings {
    models: ModelConfig[];
    defaultModelId: string;
    defaultModel: ModelConfig;
}

// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息内容类型
export type MessageContentType = 'text' | 'image_url' | 'file';

// 文件资源接口
export interface FileResource {
    url: string;
    detail: string;
}

// 消息内容接口
export interface MessageContent {
    type: MessageContentType;
    text?: string;
    image_url?: FileResource;
    file?: FileResource;
}

// 对话消息接口
export interface Message {
    id: string;
    timestamp: number;
    isUser: boolean;
    content: MessageContent[];
    role: MessageRole;
}

// 会话消息接口
export interface Session {
    id: string;
    title: string;
    messages: Message[];
    lastMessage: string;
    timestamp: number;
    messagesCount: number;
    isPinned?: boolean;
}

// 聊天消息接口
export interface LLMRequestMessage {
    role: MessageRole;
    content: string | MessageContent[];
}

// 聊天请求体
export interface LLMRequestFullBody {
    messages: LLMRequestMessage[];
    model?: string;
    temperature?: number;  // 控制输出的随机性 (0-1)
    max_tokens?: number;  // 生成文本的最大长度
    max_completion_tokens?: number;  // 补全文本的最大长度
    top_p?: number;  // 控制输出的多样性 (0-1)
    frequency_penalty?: number;  // 控制重复词汇的惩罚程度 (-2.0-2.0)
    presence_penalty?: number;  // 控制话题重复的惩罚程度 (-2.0-2.0)
    stop?: string[] | null;  // 停止生成的标记
    stream?: boolean;  // 是否启用流式响应
}

// 插件请求类型
export type ExtensionRequestType = 'chat' | 'session' | 'content';

// content操作类型
export type ContentOperate = 'translate' | 'summarize' | 'analyze' | 'explain';

// session操作类型
export type SessionOperate = 'getSessions' | 'setCurrentSession' | 'createSession' | 'deleteSession' | 'getSessionMessages' | 'getCurrentSession' | 'updateSessionTitle' | 'toggleSessionPin';

// chat操作类型
export type ChatOperate = 'single' | 'multi';

// 插件请求内容
export interface HandleExtensionRequest {
    type: ExtensionRequestType
    operate: ContentOperate | SessionOperate | ChatOperate;
    content?: MessageContent[] | null;
    session?: Session | null;
}

// 流式响应接口
export interface StreamChunkResponse {
    content: string;
    done: boolean;
}

