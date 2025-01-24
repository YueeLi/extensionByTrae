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

    // 保存设置到Chrome存储
    const handleSave = async () => {
        try {
            await chrome.storage.sync.set(settings);
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus(null);
                onHomeClick?.();
            }, 3000);
        } catch (error) {
            setSaveStatus('error');
            setTimeout(() => {
                setSaveStatus(null);
                onHomeClick?.();
            }, 3000);
        }
    };

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
                />
                <TextField
                    label="Endpoint"
                    value={settings.endpoint}
                    onChange={(e) => setSettings({ ...settings, endpoint: e.target.value })}
                    placeholder="https://your-resource.openai.azure.com"
                    fullWidth
                />
                <TextField
                    label="Deployment Name"
                    value={settings.deploymentName}
                    onChange={(e) => setSettings({ ...settings, deploymentName: e.target.value })}
                    fullWidth
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
                    保存设置
                </Button>
                {saveStatus === 'success' && (
                    <Alert severity="success">设置已保存</Alert>
                )}
                {saveStatus === 'error' && (
                    <Alert severity="error">保存设置失败</Alert>
                )}
            </Box>
        </Box>
    );
};

export default SettingsPanel;