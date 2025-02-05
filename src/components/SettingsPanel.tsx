import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Settings, ModelConfig } from '../types';

// 设置面板组件：管理Azure OpenAI的API配置
interface SettingsPanelProps {
    onHomeClick?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onHomeClick }) => {
    // 初始化设置状态
    const [settings, setSettings] = useState<Settings>({
        models: [{
            id: '1',
            name: 'GPT-4',
            deploymentName: '',
            apiVersion: '2024-02-15-preview',
            model: 'gpt-4',
            apiKey: '',
            endpoint: ''
        }],
        apiKey: '',  // 添加缺失的apiKey属性
        endpoint: '' // 添加缺失的endpoint属性
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
            name: '',
            deploymentName: '',
            apiVersion: '2024-02-15-preview',
            model: 'gpt-4',
            apiKey: '',
            endpoint: ''
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
        name: '',
        deploymentName: '',
        apiVersion: '2024-02-15-preview',
        model: 'gpt-4',
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

    // 添加模型配置对话框
    const ModelDialog = () => (
        <Dialog open={isModelDialogOpen} onClose={() => setIsModelDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                <Typography variant="h6">{editingModel ? '编辑模型' : '添加模型'}</Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#666666' }}>
                    {editingModel ? '修改现有模型的配置参数' : '添加新的模型配置并设置相关参数'}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: '#1A1A1A' }}>基础配置</Typography>
                        <Box sx={{ display: 'grid', gap: 2 }}>
                            <TextField
                                label="模型名称"
                                value={modelFormData.name}
                                onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                                fullWidth
                                required
                                helperText="为您的模型配置设置一个易识别的名称"
                            />
                            <TextField
                                label="Deployment Name"
                                value={modelFormData.deploymentName}
                                onChange={(e) => setModelFormData({ ...modelFormData, deploymentName: e.target.value })}
                                fullWidth
                                required
                                helperText="Azure OpenAI 部署名称"
                            />
                            <TextField
                                label="Model"
                                value={modelFormData.model}
                                onChange={(e) => setModelFormData({ ...modelFormData, model: e.target.value })}
                                fullWidth
                                required
                                helperText="选择要使用的模型，如 gpt-4"
                            />
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: '#1A1A1A' }}>API 配置</Typography>
                        <Box sx={{ display: 'grid', gap: 2 }}>
                            <TextField
                                label="API Key"
                                value={modelFormData.apiKey}
                                onChange={(e) => setModelFormData({ ...modelFormData, apiKey: e.target.value })}
                                type="password"
                                fullWidth
                                required
                                helperText="您的 Azure OpenAI API 密钥"
                            />
                            <TextField
                                label="Endpoint"
                                value={modelFormData.endpoint}
                                onChange={(e) => setModelFormData({ ...modelFormData, endpoint: e.target.value })}
                                placeholder="https://your-resource.openai.azure.com"
                                fullWidth
                                required
                                helperText="Azure OpenAI 服务终端点 URL"
                            />
                            <TextField
                                label="API Version"
                                value={modelFormData.apiVersion}
                                onChange={(e) => setModelFormData({ ...modelFormData, apiVersion: e.target.value })}
                                fullWidth
                                required
                                helperText="API 版本，如 2024-02-15-preview"
                            />
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: '#1A1A1A' }}>高级配置</Typography>
                        <Box sx={{ display: 'grid', gap: 2 }}>
                            <TextField
                                label="API Format"
                                value={modelFormData.apiFormat}
                                onChange={(e) => setModelFormData({ ...modelFormData, apiFormat: e.target.value as 'azure' | 'openai' })}
                                select
                                fullWidth
                                helperText="选择 API 调用格式"
                            >
                                <MenuItem value="azure">Azure</MenuItem>
                                <MenuItem value="openai">OpenAI</MenuItem>
                            </TextField>
                            <TextField
                                label="API Path"
                                value={modelFormData.apiPath}
                                onChange={(e) => setModelFormData({ ...modelFormData, apiPath: e.target.value })}
                                placeholder="/v1/chat/completions"
                                fullWidth
                                helperText="仅在使用 OpenAI 兼容格式时需要设置"
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2, gap: 1 }}>
                <Button
                    onClick={() => setIsModelDialogOpen(false)}
                    color="inherit"
                    sx={{
                        color: '#666666',
                        '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.04)'
                        }
                    }}
                >
                    取消
                </Button>
                <Button
                    onClick={handleSaveModelConfig}
                    variant="contained"
                    sx={{
                        bgcolor: '#1A7FE9',
                        '&:hover': { bgcolor: '#1565C0' }
                    }}
                >
                    {editingModel ? '更新' : '添加'}
                </Button>
            </DialogActions>
        </Dialog>
    );

    // 组件加载时从Chrome存储中读取设置
    useEffect(() => {
        chrome.storage.sync.get(['models', 'defaultModelId'], (result) => {
            setSettings({
                models: result.models || [{
                    id: '1',
                    name: 'GPT-4',
                    deploymentName: '',
                    apiVersion: '2024-02-15-preview',
                    model: 'gpt-4',
                    apiKey: '',
                    endpoint: ''
                }],
                apiKey: '',  // 添加缺失的apiKey属性
                endpoint: '' // 添加缺失的endpoint属性
            });
        });
    }, []);

    const validateModelSettings = async (model: ModelConfig) => {
        if (!model.deploymentName.trim()) {
            throw new Error(`模型 "${model.name}" 的 Deployment Name 不能为空`);
        }

        if (!model.apiKey?.trim()) {
            throw new Error(`模型 "${model.name}" 的 API Key 不能为空`);
        }

        if (!model.endpoint?.trim()) {
            throw new Error(`模型 "${model.name}" 的 Endpoint 不能为空`);
        }

        // 验证 Endpoint 格式
        try {
            new URL(model.endpoint);
        } catch {
            throw new Error(`模型 "${model.name}" 的 Endpoint 格式无效，请输入完整的 URL`);
        }

        // 根据不同的API格式执行不同的验证
        try {
            if (model.apiFormat === 'openai') {
                const response = await fetch(`${model.endpoint}/openai/deployments/${model.deploymentName}/chat/completions?api-version=${model.apiVersion}`, {
                    method: 'POST',
                    headers: {
                        'api-key': model.apiKey,
                        'Content-Type': 'application/json',
                        ...(model.requestConfig?.headers || {})
                    },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: 'This is a test message.' }],
                        max_completion_tokens: 1,
                        ...(model.requestConfig?.bodyTemplate || {})
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || '未知错误');
                }
            } else {
                // Azure 格式验证
                const apiPath = model.apiPath || '/v1/chat/completions';
                const response = await fetch(`${model.endpoint}${apiPath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${model.apiKey}`,
                        'Content-Type': 'application/json',
                        ...(model.requestConfig?.headers || {})
                    },
                    body: JSON.stringify({
                        model: model.model,
                        messages: [{ role: 'system', content: 'This is a test message.' }],
                        max_tokens: 1,
                        ...(model.requestConfig?.bodyTemplate || {})
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || '未知错误');
                }
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
            if (await handleValidateModel(model)) {
                const updatedModels = settings.models.map(m =>
                    m.id === model.id ? model : m
                );
                await chrome.storage.sync.set({ models: updatedModels });
                setSettings(prev => ({ ...prev, models: updatedModels }));
                setError(null);
                return true;
            }
            return false;
        } catch (error) {
            setError(error instanceof Error ? error.message : '保存失败');
            return false;
        }
    };

    // 设置默认模型
    const [defaultModelId, setDefaultModelId] = useState<string>('');

    useEffect(() => {
        chrome.storage.sync.get(['defaultModelId'], (result) => {
            if (result.defaultModelId) {
                setDefaultModelId(result.defaultModelId);
            }
        });
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
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#1A1A1A', fontWeight: 600 }}>
                Azure LLM 设置
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#666666' }}>
                配置您的Azure OpenAI模型参数，支持多个模型配置和灵活的API调用方式
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                                            {model.name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666666' }}>
                                            {model.deploymentName} ({model.model})
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
            {ModelDialog()}
        </Box>
    );
};

export default SettingsPanel;