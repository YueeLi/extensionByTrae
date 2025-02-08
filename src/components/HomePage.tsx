import React, { useState, useEffect } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ChatPanel from './ChatPanel';

import SettingsPanel from './SettingsPanel';
import Header from './Header';
import WelcomePage from './WelcomePage';
import { ModelConfig } from '../types/model';
import { MultiModelSession } from '../types/multi-model';

// 侧边栏面板的主页组件
const HomePage: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<'home' | 'chat' | 'settings'>('home');

    const [models, setModels] = useState<ModelConfig[]>([]);
    const [currentSession, setCurrentSession] = useState<MultiModelSession>();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 从存储中加载模型配置和默认模型ID
        chrome.storage.sync.get(['models', 'defaultModelId'], (result) => {
            if (result.models && Array.isArray(result.models)) {
                setModels(result.models);
                // 如果有默认模型ID，自动选择该模型
                if (result.defaultModelId) {
                    setSelectedModels([result.defaultModelId]);
                } else if (result.models.length > 0) {
                    // 如果没有默认模型ID但有模型配置，选择第一个模型
                    setSelectedModels([result.models[0].id]);
                }
            }
        });
    }, []);

    const handleSendMultiModelMessage = async (modelIds: string[], content: string) => {
        if (!modelIds.length) {
            throw new Error('请选择至少一个模型');
        }

        setIsLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'multiModelChat',
                modelIds,
                content
            });

            if (!response) {
                throw new Error('请求失败，请重试');
            }

            // 更新会话状态
            setCurrentSession(prev => {
                const session = {
                    ...response,
                    modelResponses: response.modelResponses?.map((modelResponse: any) => ({
                        ...modelResponse,
                        status: modelResponse.status || 'pending',
                        response: {
                            ...modelResponse.response,
                            content: Array.isArray(modelResponse.response?.content)
                                ? modelResponse.response.content
                                : JSON.parse(modelResponse.response?.content || '[]')
                        }
                    })) || []
                };
                return session;
            });

            return response;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            console.error('多模型对话请求失败:', errorMessage);
            throw new Error(`请求失败: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [chatMode, setChatMode] = useState<'single' | 'multi'>('single');

    // 当选择的模型数量改变时，更新聊天模式
    useEffect(() => {
        setChatMode(selectedModels.length > 1 ? 'multi' : 'single');
    }, [selectedModels]);

    const handleModelSelect = (modelId: string) => {
        setSelectedModels(prev => {
            if (prev.includes(modelId)) {
                return prev.filter(id => id !== modelId);
            }
            if (chatMode === 'multi' && prev.length >= 3) {
                return prev;
            }
            return chatMode === 'multi' ? [...prev, modelId] : [modelId];
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Header
                onHomeClick={() => setCurrentPage('home')}
                onSettingsClick={() => setCurrentPage('settings')}
                onChatClick={() => setCurrentPage('chat')}
            />
            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {currentPage === 'settings' ? (
                    <SettingsPanel onHomeClick={() => setCurrentPage('home')} />
                ) : currentPage === 'home' ? (
                    <WelcomePage onStart={() => setCurrentPage('chat')} />
                ) : (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <ChatPanel
                            selectedModels={selectedModels}
                            models={models}
                            onSendMessage={handleSendMultiModelMessage}
                            currentSession={currentSession}
                            isMultiModel={selectedModels.length > 1}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default HomePage;