// Model相关接口
export interface ModelConfig {
    id: string;
    name: string;
    deploymentName: string;
    apiVersion: string;
    model: string;
    apiKey: string;
    endpoint: string;
    apiFormat?: 'azure' | 'openai' | 'custom';
    apiPath?: string;
    requestConfig?: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
        bodyTemplate?: Record<string, any>;
    };
}

export interface ModelRequestConfig {
    buildUrl: (model: ModelConfig) => string;
    buildHeaders: (model: ModelConfig) => Record<string, string>;
    buildBody: (messages: Message[], model: ModelConfig) => ChatRequestBody;
}

// 设置相关接口
export interface Settings {
    models: ModelConfig[];
    defaultModelId?: string;
    defaultModel?: ModelConfig;
}

// 消息相关接口
export interface Message {
    id: string;
    timestamp: number;
    isUser: boolean;
    content: MessageContent[];
    role: 'user' | 'assistant' | 'system';
}

export interface MessageContent {
    type: 'text' | 'image_url' | 'file';
    text?: string;
    image_url?: FileResource;
    file?: FileResource;
}

export interface FileResource {
    url: string;
    detail: string;
}

// 请求相关接口
export interface ChatRequest {
    modelId?: string;
    content?: MessageContent[];
    useStream?: boolean;
}

export interface ChatRequestBody {
    messages: Message[];
    model?: string;
    max_tokens?: number;
    max_completion_tokens?: number;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[] | null;
    stream?: boolean;
}

export interface MessageRequest {
    type: 'chat' | 'translate' | 'summarize' | 'analyze' | 'explain';
    text: string;
    files?: File;
    fileType?: string;
    targetLang?: string;
}

// 响应相关接口
export interface MessageResponse {
    content?: string;
    error?: string;
}

export interface TextProcessingResponse {
    error?: string;
    result?: string;
}

export interface StreamChunkResponse {
    content: string;
    done: boolean;
}

// 工具类接口
export interface FileContent {
    type: 'image_url' | 'file';
    image_url?: FileResource;
    file?: FileResource;
}