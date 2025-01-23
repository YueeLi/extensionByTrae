export interface Settings {
    apiKey: string;
    endpoint: string;
    deploymentName: string;
    apiVersion: string;
    model: string;
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