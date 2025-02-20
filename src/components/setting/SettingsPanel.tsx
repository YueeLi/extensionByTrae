import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, IconButton, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Settings, ModelConfig } from '../../types/types';
import ModelDialog from '../setting/ModelDialog';

// 设置面板组件：管理Azure OpenAI的API配置
interface SettingsPanelProps {
    onHomeClick?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onHomeClick }) => {
    // 初始化设置状态
    const [settings, setSettings] = useState<Settings>({
        models: [{
            id: '1',
            deploymentName: '',
            apiVersion: '2024-02-15-preview',
            model: 'gpt-4o',
            apiKey: '',
            endpoint: '',
            apiFormat: 'azure',
            apiPath: '',
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
            requestConfig: {
                headers: {},
                params: {},
                bodyTemplate: {}
            }
        }],
        defaultModelId: '1',
        defaultModel: {
            id: '1',
            deploymentName: '',
            apiVersion: '2024-02-15-preview',
            model: 'gpt-4o',
            apiKey: '',
            endpoint: '',
            apiFormat: 'azure',
            apiPath: '',
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
            requestConfig: {
                headers: {},
                params: {},
                bodyTemplate: {}
            }
        }
    });
    // 保存状态反馈
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
    const handleAddModel = () => {
        setEditingModel(null);
        setModelFormData({
            id: Date.now().toString(),
            deploymentName: '',
            apiVersion: '2024-02-15-preview',
            model: 'gpt-4o',
            apiKey: '',
            endpoint: '',
            apiFormat: 'azure',
            apiPath: '',
            temperature: 0.7,
            max_tokens: 4096,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
            requestConfig: {
                headers: {},
                params: {},
                bodyTemplate: {}
            }
        });
        setIsModelDialogOpen(true);
    };

    const handleEditModel = (model: ModelConfig) => {
        setEditingModel(model);
        setModelFormData(model);
        setIsModelDialogOpen(true);
    };

    const handleDeleteModel = (modelId: string) => {
        setSettings(prev => ({
            ...prev,
            models: prev.models.filter(m => m.id !== modelId)
        }));
    };

    const handleSaveModelConfig = () => {
        if (editingModel) {
            setSettings(prev => ({
                ...prev,
                models: prev.models.map(m => m.id === editingModel.id ? modelFormData : m)
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                models: [...prev.models, modelFormData]
            }));
        }
        setIsModelDialogOpen(false);
    };

    const [modelFormData, setModelFormData] = useState<ModelConfig>({
        id: '',
        deploymentName: '',
        apiVersion: '2024-02-15-preview',
        model: 'gpt-4o',
        apiKey: '',
        endpoint: '',
        apiFormat: 'azure',
        apiPath: '',
        requestConfig: {
            headers: {},
            params: {},
            bodyTemplate: {}
        }
    });

    const validateModelSettings = async (model: ModelConfig) => {
        if (!model.deploymentName.trim()) {
            throw new Error(`模型 "${model.model}" 的 Deployment Name 不能为空`);
        }

        if (!model.apiKey?.trim()) {
            throw new Error(`模型 "${model.model}" 的 API Key 不能为空`);
        }

        if (!model.endpoint?.trim()) {
            throw new Error(`模型 "${model.model}" 的 Endpoint 不能为空`);
        }

        // 验证 Endpoint 格式
        try {
            new URL(model.endpoint);
        } catch {
            throw new Error(`模型 "${model.model}" 的 Endpoint 格式无效，请输入完整的 URL`);
        }

        // 验证API格式相关的必填字段
        if (model.apiFormat === 'custom' && !model.apiPath?.trim()) {
            throw new Error(`模型 "${model.model}" 使用自定义API格式时，API路径不能为空`);
        }

        // 根据不同的API格式执行不同的验证
        try {
            const url = model.apiFormat === 'azure'
                ? `${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`
                : `${model.endpoint}${model.apiPath || '/v1/chat/completions'}`;

            const headers = model.apiFormat === 'azure'
                ? {
                    'api-key': model.apiKey,
                    'Content-Type': 'application/json',
                    ...(model.requestConfig?.headers || {})
                }
                : {
                    'Authorization': `Bearer ${model.apiKey}`,
                    'Content-Type': 'application/json',
                    ...(model.requestConfig?.headers || {})
                };

            const body = {
                messages: [{ role: 'user', content: 'This is a test message.' }],
                model: model.deploymentName,
                max_completion_tokens: 1,
                ...(model.requestConfig?.bodyTemplate || {})
            };

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '未知错误');
            }
        } catch (error) {
            throw new Error(`API 连接测试失败: ${error instanceof Error ? error.message : '连接错误'}`);
        }
    };

    const handleValidateModel = async (model: ModelConfig) => {
        try {
            await validateModelSettings(model);
            setError(null);
            setSaveStatus('success');
            return true;
        } catch (error) {
            setError(error instanceof Error ? error.message : '验证失败');
            setSaveStatus('error');
            return false;
        }
    };

    const handleSaveModel = async (model: ModelConfig) => {
        try {

            if (!model.model?.trim()) {
                throw new Error('模型标识不能为空');
            }
            if (await handleValidateModel(model)) {
                const updatedModels = settings.models.map(m =>
                    m.id === model.id ? {
                        ...model,
                        temperature: model.temperature || 0.7,
                        max_tokens: model.max_tokens || 4096,
                        max_completion_tokens: model.max_completion_tokens || 4096,
                        top_p: model.top_p || 0.95,
                        frequency_penalty: model.frequency_penalty || 0,
                        presence_penalty: model.presence_penalty || 0,
                        stream: model.stream || false
                    } : m
                );
                try {
                    await chrome.storage.sync.set({ models: updatedModels });
                    setSettings(prev => ({ ...prev, models: updatedModels }));
                    setError(null);
                    setSaveStatus('success');
                    return true;
                } catch (storageError) {
                    throw new Error('保存到浏览器存储失败，请重试');
                }
            }
            return false;
        } catch (error) {
            setError(error instanceof Error ? error.message : '保存失败');
            setSaveStatus('error');
            return false;
        }
    };

    // 设置默认模型
    const [defaultModelId, setDefaultModelId] = useState<string>('');

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const result = await chrome.storage.sync.get(['defaultModelId', 'models']);
                console.log('get settings result:', result);
                if (result.defaultModelId) {
                    setDefaultModelId(result.defaultModelId);
                }
                if (result.models && Array.isArray(result.models) && result.models.length > 0) {
                    setSettings(prev => ({
                        ...prev,
                        models: result.models.map((model: ModelConfig) => ({
                            ...model,
                            temperature: model.temperature || 0.7,
                            max_tokens: model.max_tokens || 4096,
                            max_completion_tokens: model.max_completion_tokens || 4096,
                            top_p: model.top_p || 0.95,
                            frequency_penalty: model.frequency_penalty || 0,
                            presence_penalty: model.presence_penalty || 0,
                            stream: model.stream || false
                        }))
                    }));
                }
            } catch (error) {
                setError('加载设置失败，请刷新页面重试');
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();
    }, []);

    const handleSetDefaultModel = async (modelId: string) => {
        try {
            await chrome.storage.sync.set({ defaultModelId: modelId });
            setDefaultModelId(modelId);
            setError(null);
        } catch (error) {
            setError('设置默认模型失败');
        }
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#FFFFFF',
                position: 'relative',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                minWidth: '320px',
                width: '100%'
            }}
        >
            <Box
                sx={{
                    p: 3,
                    height: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)'
                }}
            >
                <Typography variant="h6" sx={{
                    color: '#1A1A1A',
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    letterSpacing: '-0.01em'
                }}>
                    Azure LLM 设置
                </Typography>

            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: '#1A1A1A', fontWeight: 500 }}>模型配置</Typography>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={handleAddModel}
                            variant="contained"
                            size="small"
                            sx={{
                                bgcolor: '#1A7FE9',
                                '&:hover': {
                                    bgcolor: '#1565C0'
                                }
                            }}
                        >
                            添加模型
                        </Button>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 2 }}>
                        {settings.models.map((model) => (
                            <Paper
                                key={model.id}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    border: '1px solid #E5E5E5',
                                    borderRadius: 2,
                                    bgcolor: '#FFFFFF',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#1A7FE9',
                                        boxShadow: '0 2px 8px rgba(26, 127, 233, 0.15)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ color: '#1A1A1A', fontWeight: 500, mb: 0.5 }}>
                                            {model.model}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666666', mb: 0.5 }}>
                                            部署名称: {model.deploymentName}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666666' }}>
                                            API格式: {model.apiFormat === 'azure' ? 'Azure' : model.apiFormat === 'openai' ? 'OpenAI' : '自定义'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditModel(model)}
                                            sx={{
                                                color: '#666666',
                                                '&:hover': { color: '#1A7FE9', bgcolor: 'rgba(26, 127, 233, 0.04)' }
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteModel(model.id)}
                                            disabled={settings.models.length === 1}
                                            sx={{
                                                color: '#666666',
                                                '&:hover': { color: '#d32f2f', bgcolor: 'rgba(211, 47, 47, 0.04)' },
                                                '&.Mui-disabled': { color: '#cccccc' }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleValidateModel(model)}
                                        sx={{
                                            borderColor: '#E5E5E5',
                                            color: '#666666',
                                            '&:hover': {
                                                borderColor: '#1A7FE9',
                                                color: '#1A7FE9',
                                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                                            }
                                        }}
                                    >
                                        验证
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => handleSaveModel(model)}
                                        sx={{
                                            bgcolor: '#1A7FE9',
                                            '&:hover': { bgcolor: '#1565C0' }
                                        }}
                                    >
                                        保存
                                    </Button>
                                    <Button
                                        size="small"
                                        variant={defaultModelId === model.id ? "contained" : "outlined"}
                                        onClick={() => handleSetDefaultModel(model.id)}
                                        color={defaultModelId === model.id ? "success" : "primary"}
                                        sx={{
                                            ml: 'auto',
                                            ...(defaultModelId === model.id ? {
                                                bgcolor: '#4caf50',
                                                '&:hover': { bgcolor: '#388e3c' }
                                            } : {
                                                borderColor: '#E5E5E5',
                                                color: '#666666',
                                                '&:hover': {
                                                    borderColor: '#4caf50',
                                                    color: '#4caf50',
                                                    bgcolor: 'rgba(76, 175, 80, 0.04)'
                                                }
                                            })
                                        }}
                                    >
                                        {defaultModelId === model.id ? '默认模型' : '设为默认'}
                                    </Button>
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </Box>

                {error && (
                    <Alert
                        severity="error"
                        onClose={() => setError(null)}
                        sx={{
                            '& .MuiAlert-message': { color: '#d32f2f' }
                        }}
                    >
                        {error}
                    </Alert>
                )}
                {saveStatus === 'success' && !error && (
                    <Alert
                        severity="success"
                        onClose={() => setSaveStatus(null)}
                        sx={{
                            '& .MuiAlert-message': { color: '#2e7d32' }
                        }}
                    >
                        验证成功
                    </Alert>
                )}
            </Box>
            <ModelDialog
                open={isModelDialogOpen}
                onClose={() => setIsModelDialogOpen(false)}
                onSave={handleSaveModelConfig}
                modelFormData={modelFormData}
                setModelFormData={setModelFormData}
                editingModel={editingModel}
            />
        </Box>
    );
};

export default SettingsPanel;