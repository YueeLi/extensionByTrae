import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';

import { Settings } from '../types';

// 设置面板组件：管理Azure OpenAI的API配置
interface SettingsPanelProps {
    onHomeClick?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onHomeClick }) => {
    // 初始化设置状态
    const [settings, setSettings] = useState<Settings>({
        apiKey: '',
        endpoint: '',
        deploymentName: '',
        apiVersion: '2024-02-15-preview',
        model: 'gpt-4'
    });
    // 保存状态反馈
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

    // 组件加载时从Chrome存储中读取设置
    useEffect(() => {
        chrome.storage.sync.get(['apiKey', 'endpoint', 'deploymentName', 'apiVersion', 'model'], (result) => {
            setSettings({
                apiKey: result.apiKey || '',
                endpoint: result.endpoint || '',
                deploymentName: result.deploymentName || '',
                apiVersion: result.apiVersion || '2024-02-15-preview',
                model: result.model || 'gpt-4'
            });
        });
    }, []);

    // 验证设置的有效性
    const validateSettings = async () => {
        // 基本格式验证
        if (!settings.apiKey.trim()) {
            throw new Error('API Key 不能为空');
        }
        if (!settings.endpoint.trim()) {
            throw new Error('Endpoint 不能为空');
        }
        if (!settings.deploymentName.trim()) {
            throw new Error('Deployment Name 不能为空');
        }

        // 验证 Endpoint 格式
        try {
            new URL(settings.endpoint);
        } catch {
            throw new Error('Endpoint 格式无效，请输入完整的 URL');
        }

        // 测试 API 连接
        try {
            const response = await fetch(`${settings.endpoint}/openai/deployments/${settings.deploymentName}/chat/completions?api-version=${settings.apiVersion}`, {
                method: 'POST',
                headers: {
                    'api-key': settings.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [{ role: 'system', content: 'This is a test message.' }],
                    max_tokens: 1
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API 连接测试失败: ${error.error?.message || '未知错误'}`);
            }
        } catch (error) {
            throw new Error(`API 连接测试失败: ${error instanceof Error ? error.message : '连接错误'}`);
        }
    };

    // 保存设置到Chrome存储
    const handleSave = async () => {
        try {
            setSaveStatus(null);
            // 先验证设置
            await validateSettings();
            // 验证通过后保存设置
            await chrome.storage.sync.set(settings);
            setSaveStatus('success');
            // 立即跳转到欢迎页面
            if (onHomeClick) {
                onHomeClick();
            }
        } catch (error) {
            setSaveStatus('error');
            const errorMessage = error instanceof Error ? error.message : '保存设置失败';
            setError(errorMessage);
        }
    };

    // 添加错误状态
    const [error, setError] = useState<string | null>(null);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
                Azure OpenAI 设置
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="API Key"
                    value={settings.apiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    type="password"
                    fullWidth
                    required
                    error={!settings.apiKey.trim()}
                    helperText={!settings.apiKey.trim() ? 'API Key 不能为空' : ''}
                />
                <TextField
                    label="Endpoint"
                    value={settings.endpoint}
                    onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                    placeholder="https://your-resource.openai.azure.com"
                    fullWidth
                    required
                    error={!settings.endpoint.trim()}
                    helperText={!settings.endpoint.trim() ? 'Endpoint 不能为空' : ''}
                />
                <TextField
                    label="Deployment Name"
                    value={settings.deploymentName}
                    onChange={(e) => setSettings({ ...settings, deploymentName: e.target.value })}
                    fullWidth
                    required
                    error={!settings.deploymentName.trim()}
                    helperText={!settings.deploymentName.trim() ? 'Deployment Name 不能为空' : ''}
                />
                <TextField
                    label="API Version"
                    value={settings.apiVersion || '2024-02-15-preview'}
                    onChange={(e) => setSettings({ ...settings, apiVersion: e.target.value })}
                    placeholder="2024-02-15-preview"
                    fullWidth
                />
                <TextField
                    label="Model"
                    value={settings.model || 'gpt-4'}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                    placeholder="gpt-4"
                    fullWidth
                />
                <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{ mt: 2 }}
                >
                    验证并保存设置
                </Button>
                {saveStatus === 'success' && (
                    <Alert severity="success" onClose={() => setSaveStatus(null)}>
                        设置验证成功并已保存，即将返回欢迎页面...
                    </Alert>
                )}
                {saveStatus === 'error' && error && (
                    <Alert severity="error" onClose={() => { setSaveStatus(null); setError(null); }}>
                        {error}
                    </Alert>
                )}
            </Box>
        </Box>
    );
};

export default SettingsPanel;