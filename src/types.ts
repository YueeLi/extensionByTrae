export interface ModelConfig {
    id: string;
    name: string;
    deploymentName: string;
    apiVersion: string;
    model: string;
    apiKey: string;
    endpoint: string;
    apiFormat?: 'azure' | 'openai';
    apiPath?: string;
    requestConfig?: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
        bodyTemplate?: Record<string, any>;
    };
}

export interface Settings {
    apiKey: string;
    endpoint: string;
    models: ModelConfig[];
}

export interface Message {
    id: string;
    timestamp: number;
    isUser: boolean;
    content: Array<{
        type: 'text' | 'image_url' | 'file';
        text?: string;
        image_url?: {
            url: string;
            detail: string;
        };
        file?: {
            url: string;
            detail: string;
        };
    }>;
    role: 'user' | 'assistant' | 'system';
    attachment?: {
        type: 'image' | 'text' | 'pdf';
        content: string;
        name: string;
    } | null;
}


export interface TextProcessingResponse {
    error?: string;
    result?: string;
}

export interface FileContent {
    type: 'image_url' | 'file';
    image_url?: {
        url: string;
        detail: string;
    };
    file?: {
        url: string;
        detail: string;
    };
}

export interface StreamChunkResponse {
    content: string;
    done: boolean;
}

export interface ChatRequest {
    text: string;
    modelId?: string;
    content?: Array<{
        type: 'text' | 'image_url' | 'file';
        text?: string;
        image_url?: {
            url: string;
            detail: string;
        };
        file?: {
            url: string;
            detail: string;
        };
    }>;
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

export interface ModelRequestConfig {
    buildUrl: (model: ModelConfig) => string;
    buildHeaders: (model: ModelConfig) => Record<string, string>;
    buildBody: (messages: Message[], model: ModelConfig) => ChatRequestBody;
}

export interface MessageRequest {
    type: 'chat' | 'translate' | 'summarize' | 'analyze' | 'explain';
    text: string;
    files?: File;
    fileType?: string;
    targetLang?: string;
}

export interface MessageResponse {
    content?: string;
    error?: string;
}