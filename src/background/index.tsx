import { Settings, Message, FileContent, StreamChunkResponse, ChatRequest, ModelConfig, ModelRequestConfig, MessageRequest, MessageResponse } from '../types';

async function getSettings(): Promise<Settings> {
    const result = await chrome.storage.sync.get(['models', 'apiKey', 'endpoint']);
    if (!result.models?.length) {
        throw new Error('请先在设置页面添加模型配置');
    }
    if (!result.apiKey) {
        throw new Error('请先在设置页面配置API密钥');
    }
    if (!result.endpoint) {
        throw new Error('请先在设置页面配置API端点');
    }
    return {
        models: result.models,
        apiKey: result.apiKey,
        endpoint: result.endpoint
    };
}

async function processStreamChunk(chunk: string): Promise<StreamChunkResponse> {
    if (chunk === '[DONE]') {
        return { content: '', done: true };
    }

    try {
        const parsed = JSON.parse(chunk);
        const content = parsed.choices?.[0]?.delta?.content || '';
        return { content, done: false };
    } catch (e) {
        console.error('解析响应数据失败:', e);
        return { content: '', done: false };
    }
}

const MODEL_CONFIGS: Record<string, ModelRequestConfig> = {
    'gpt-4o': {
        buildUrl: (model) => `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'api-key': model.apiKey,
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_completion_tokens: 4096,
            temperature: 0.7,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: null,
            ...model.requestConfig?.bodyTemplate
        })
    },
    'o1-mini': {
        buildUrl: (model) => `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'api-key': model.apiKey,
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_completion_tokens: 4096,
            ...model.requestConfig?.bodyTemplate
        })
    },
    'deepseek': {
        buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.apiKey}`,
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_tokens: 4096,
            ...model.requestConfig?.bodyTemplate
        })
    },
    'llama3': {
        buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.apiKey}`,
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_tokens: 4096,
            temperature: 0.7,
            ...model.requestConfig?.bodyTemplate
        })
    },
    'claude': {
        buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.apiKey}`,
            'anthropic-version': '2023-06-01',
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_tokens: 4096,
            temperature: 0.7,
            ...model.requestConfig?.bodyTemplate
        })
    },
    'qwen2': {
        buildUrl: (model) => `${model.endpoint}/v1/chat/completions`,
        buildHeaders: (model) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.apiKey}`,
            ...model.requestConfig?.headers
        }),
        buildBody: (messages, model) => ({
            messages,
            model: model.model,
            max_tokens: 4096,
            temperature: 0.7,
            ...model.requestConfig?.bodyTemplate
        })
    }
};

async function callAzureOpenAI(info: ChatRequest): Promise<string> {
    console.log('callAzureAPI:', info);

    if (!info?.content?.length && !info?.text?.trim()) {
        throw new Error('输入内容不能为空');
    }

    const settings = await getSettings();
    const { models } = settings;
    const defaultModelId = (await chrome.storage.sync.get(['defaultModelId'])).defaultModelId;

    // 优先使用指定的模型ID，其次使用默认模型ID，最后使用第一个模型
    const selectedModel = info.modelId
        ? models.find(m => m.id === info.modelId)
        : defaultModelId
            ? models.find(m => m.id === defaultModelId)
            : models[0];

    if (!selectedModel) {
        throw new Error('未找到指定的模型配置');
    }

    const messages = [];
    messages.push({
        role: 'user',
        content: info.content || [{
            type: 'text',
            text: info.text
        }],
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        isUser: true
    });

    try {
        // 获取模型配置
        const modelConfig = MODEL_CONFIGS[selectedModel.model];
        if (!modelConfig) {
            throw new Error(`不支持的模型类型: ${selectedModel.model}`);
        }

        // 构建请求URL和请求头
        const url = modelConfig.buildUrl(selectedModel);
        const headers = modelConfig.buildHeaders(selectedModel);

        // 构建请求体
        const requestBody = {
            ...modelConfig.buildBody(messages, selectedModel),
            stream: info.useStream ?? false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        if (!info.useStream) {
            const result = await response.json();
            return result.choices[0]?.message?.content || '';
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('无法获取响应流');
        }

        let fullText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const { content, done } = await processStreamChunk(line.slice(6));
                    if (done) continue;
                    fullText += content;
                }
            }
        }

        if (!fullText) {
            throw new Error('API返回的响应内容无效');
        }

        return fullText;
    } catch (error) {
        console.error('API调用出错:', error);
        throw error;
    }
}

// 在插件启动或安装/更新时清空历史记录
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.remove(['chatHistory']);
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.remove(['chatHistory']);
});

// 更新历史记录的通用函数
async function updateHistory(userMessage: Message, assistantMessage: Message) {
    const history = await chrome.storage.local.get(['chatHistory']);
    const chatHistory = history.chatHistory || [];

    // 添加新的对话记录
    chatHistory.push(userMessage, assistantMessage);

    // 如果历史记录超过30条消息，则只保留最近的50条
    if (chatHistory.length > 30) {
        chatHistory.splice(0, chatHistory.length - 30);
    }

    console.log('chat history:', chatHistory);

    // 更新存储中的历史记录
    await chrome.storage.local.set({ chatHistory });
}

// 创建统一的消息构建函数
function createMessage(role: 'user' | 'assistant' | 'system', text: string, fileContent?: FileContent): Message {
    const content: any[] = [];
    if (fileContent) {
        content.push(fileContent);
    }
    content.push({
        type: 'text',
        text: text
    });
    return {
        role,
        content,
        id: crypto.randomUUID(), // 生成唯一ID
        timestamp: Date.now(), // 添加时间戳
        isUser: role === 'user' // 根据role判断是否为用户消息
    };
}

// 创建系统消息
function createSystemMessage(): Message {
    return createMessage('system', 'You are a helpful assistant.');
}

// 创建用户消息
function createUserMessage(text: string, file?: File | null): Message {
    if (!file) {
        return createMessage('user', text);
    }

    const fileContent: FileContent = {
        type: file.type === 'image' ? 'image_url' : 'file'
    };

    if (file.type === 'image') {
        fileContent.image_url = {
            url: URL.createObjectURL(file),
            detail: 'low'
        };
    } else {
        fileContent.file = {
            url: URL.createObjectURL(file),
            detail: 'low'
        };
    }

    return createMessage('user', text, fileContent);
}

// 创建助手消息
function createAssistantMessage(text: string): Message {
    return createMessage('assistant', text);
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
    console.log('Received message:', message);

    if (!message.type) {
        console.error('Message type not specified');
        sendResponse({ error: '消息类型未指定' });
        return false;
    }

    const messageHandlers = {
        chat: () => handleChatRequest(message.text, message.files || null),
        translate: () => handleTranslateRequest(message.text, message.targetLang),
        summarize: () => handleSummarizeRequest(message.text),
        analyze: () => handleAnalyzeRequest(message.text),
        explain: () => handleAIRequest(message, sender, sendResponse)
    };

    const handler = messageHandlers[message.type];
    if (!handler) {
        console.error('Unknown message type:', message.type);
        sendResponse({ error: '未知的消息类型' });
        return false;
    }

    handler()
        .then((response) => {
            sendResponse({ content: response });
            return response;
        })
        .catch((error: Error) => {
            console.error(`${message.type} request failed:`, error);
            sendResponse({ error: error.message || '处理请求失败' });
        });

    return true;
});

// 处理Azure OpenAI调用和历史记录更新的通用函数
async function handleAzureOpenAIRequest(userMessage: Message, modelId?: string): Promise<string> {
    const chatRequest: ChatRequest = {
        text: userMessage.content.find(c => c.type === 'text')?.text || '',
        content: userMessage.content,
        modelId
    };

    const response = await callAzureOpenAI(chatRequest);
    const assistantMessage = createAssistantMessage(response);
    await updateHistory(userMessage, assistantMessage);
    return response;
}

// 处理聊天请求
async function handleChatRequest(text: string, files: File | null, modelId?: string): Promise<string> {
    const userMessage = createUserMessage(text, files);
    return handleAzureOpenAIRequest(userMessage, modelId);
}

// 处理翻译请求
async function handleTranslateRequest(text: string, targetLang?: string): Promise<string> {
    const userMessage = createUserMessage(`请将以下内容翻译${targetLang ? `成${targetLang}` : ''}：\n${text}`);
    return handleAzureOpenAIRequest(userMessage);
}

// 处理总结请求
async function handleSummarizeRequest(text: string): Promise<string> {
    const userMessage = createUserMessage(`请总结以下内容的要点：\n${text}`);
    return handleAzureOpenAIRequest(userMessage);
}

// 处理分析请求
async function handleAnalyzeRequest(text: string): Promise<string> {
    const userMessage = createUserMessage(`请分析以下内容并提供见解：\n${text}`);
    return handleAzureOpenAIRequest(userMessage);
}

// 处理AI相关请求
async function handleAIRequest(message: MessageRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) {
    try {
        const userMessage = createUserMessage(`请${message.type === 'translate' ? '翻译' :
            message.type === 'summarize' ? '总结' :
                message.type === 'analyze' ? '分析' : '解释'}以下内容：\n${message.text}`);

        const response = await handleAzureOpenAIRequest(userMessage);
        sendResponse({ content: response });
    } catch (error) {
        console.error('AI request failed:', error);
        sendResponse({ error: error instanceof Error ? error.message : '处理请求失败' });
    }
}
// 配置侧边栏行为，使点击扩展图标时打开侧边栏
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));