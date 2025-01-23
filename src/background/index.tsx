import { Settings, Message } from '../types';

interface FileContent {
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

async function getSettings(): Promise<Settings> {
    const result = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deploymentName', 'apiVersion', 'model']);
    if (!result.apiKey || !result.endpoint || !result.deploymentName) {
        throw new Error('请先完成Azure OpenAI设置');
    }
    return {
        apiKey: result.apiKey,
        endpoint: result.endpoint,
        deploymentName: result.deploymentName,
        apiVersion: result.apiVersion || '2024-02-15-preview',
        model: result.model || 'gpt-4'
    };
}

interface AzureOpenAIResponse {
    choices: {
        delta?: {
            content?: string;
        };
        text?: string;
    }[];
}

interface StreamChunkResponse {
    content: string;
    done: boolean;
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

async function callAzureOpenAI(info: object): Promise<string> {
    if (!info || Object.keys(info).length === 0) {
        throw new Error('输入内容不能为空或undefined');
    }

    const settings = await getSettings();

    if (!settings.apiKey || !settings.endpoint || !settings.deploymentName) {
        throw new Error('请先完成Azure OpenAI设置');
    }

    const messages = [];
    if (messages.length === 0) {
        messages.push(createSystemMessage());
    }
    messages.push(info);

    try {
        const response = await fetch(`${settings.endpoint}/openai/deployments/${settings.deploymentName}/chat/completions?api-version=${settings.apiVersion}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': settings.apiKey
            },
            body: JSON.stringify({
                messages,
                model: settings.model,
                max_tokens: 4096,
                temperature: 0.7,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop: null,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Azure OpenAI API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
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
        console.error('Azure OpenAI API调用出错:', error);
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


interface MessageRequest {
    type: 'chat' | 'translate' | 'summarize' | 'analyze' | 'explain';
    text: string;
    files?: File;
    fileType?: string;
    targetLang?: string;
}

interface MessageResponse {
    content?: string;
    error?: string;
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
async function handleAzureOpenAIRequest(userMessage: Message): Promise<string> {
    const response = await callAzureOpenAI(userMessage);
    const assistantMessage = createAssistantMessage(response);
    await updateHistory(userMessage, assistantMessage);
    return response;
}

// 处理聊天请求
async function handleChatRequest(text: string, files: File | null): Promise<string> {
    const userMessage = createUserMessage(text, files);
    return handleAzureOpenAIRequest(userMessage);
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