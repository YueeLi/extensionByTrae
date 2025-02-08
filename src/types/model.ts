// 模型配置相关类型定义
import { ChatRequestBody, ChatMessage } from './message';

// Model详细定义 - 包含模型的所有配置参数
export interface ModelConfig {
    // 基础配置
    id: string;                    // 模型配置的唯一标识
    name: string;                  // 模型配置的显示名称
    model: string;                 // 模型名称
    apiFormat: 'azure' | 'openai' | 'custom';  // API格式

    // API配置
    deploymentName: string;        // Azure部署名称
    apiVersion: string;            // API版本
    apiKey: string;                // API密钥
    endpoint: string;              // API端点
    apiPath?: string;              // 自定义API路径（仅custom格式需要）

    // 自定义请求配置
    requestConfig?: {
        headers?: Record<string, string>;     // 自定义请求头
        params?: Record<string, string>;      // 自定义URL参数
        bodyTemplate?: Record<string, any>;   // 自定义请求体模板
    };

    // 模型参数配置
    temperature?: number;          // 控制输出的随机性 (0-1)
    max_tokens?: number;           // 生成文本的最大长度
    max_completion_tokens?: number; // 补全文本的最大长度
    top_p?: number;                // 控制输出的多样性 (0-1)
    frequency_penalty?: number;     // 控制重复词汇的惩罚程度 (-2.0-2.0)
    presence_penalty?: number;      // 控制话题重复的惩罚程度 (-2.0-2.0)
    stop?: string[] | null;         // 停止生成的标记
    stream?: boolean;               // 是否启用流式响应
}

// 请求体封装 - 用于构建API请求
export interface ModelRequestConfig {
    buildUrl: (model: ModelConfig) => string;  // 构建请求URL
    buildHeaders: (model: ModelConfig) => Record<string, string>;  // 构建请求头
    buildBody: (messages: ChatMessage[], model: ModelConfig) => ChatRequestBody;  // 构建请求体
}

// 设置相关接口 - 用于管理模型配置
export interface Settings {
    models: ModelConfig[];         // 所有可用的模型配置
    defaultModelId: string;        // 默认模型ID
    defaultModel: ModelConfig;     // 默认模型配置
}

// 流式响应接口 - 用于处理流式响应数据
export interface StreamChunkResponse {
    content: string;              // 响应内容
    done: boolean;                // 是否完成
}

// 聊天请求接口 - 从message.ts导入以避免循环依赖
export type { ChatRequest } from './message';

