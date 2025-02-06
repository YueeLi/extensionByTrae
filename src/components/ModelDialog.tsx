import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import { ModelConfig } from '../types';

interface ModelDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    modelFormData: ModelConfig;
    setModelFormData: (data: ModelConfig) => void;
    editingModel: ModelConfig | null;
}

const ModelDialog: React.FC<ModelDialogProps> = ({
    open,
    onClose,
    onSave,
    modelFormData,
    setModelFormData,
    editingModel
}) => {
    const handleChange = (field: keyof ModelConfig, value: string) => {
        setModelFormData({
            ...modelFormData,
            [field]: value
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {editingModel ? '编辑模型配置' : '添加新模型'}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                    <TextField
                        label="模型名称"
                        value={modelFormData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Deployment Name"
                        value={modelFormData.deploymentName}
                        onChange={(e) => handleChange('deploymentName', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="API Version"
                        value={modelFormData.apiVersion}
                        onChange={(e) => handleChange('apiVersion', e.target.value)}
                        fullWidth
                        required
                    />
                    <FormControl fullWidth required>
                        <InputLabel>Model</InputLabel>
                        <Select
                            value={modelFormData.model}
                            label="Model"
                            onChange={(e) => handleChange('model', e.target.value)}
                        >
                            <MenuItem value="gpt-4o">GPT-4O</MenuItem>
                            <MenuItem value="o1-mini">O1-Mini</MenuItem>
                            <MenuItem value="deepseek">DeepSeek</MenuItem>
                            <MenuItem value="llama3">Llama3</MenuItem>
                            <MenuItem value="claude">Claude</MenuItem>
                            <MenuItem value="qwen2">Qwen2</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth required>
                        <InputLabel>API格式</InputLabel>
                        <Select
                            value={modelFormData.apiFormat || 'azure'}
                            label="API格式"
                            onChange={(e) => handleChange('apiFormat', e.target.value)}
                        >
                            <MenuItem value="azure">Azure</MenuItem>
                            <MenuItem value="openai">OpenAI</MenuItem>
                            <MenuItem value="custom">自定义</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="API Key"
                        value={modelFormData.apiKey}
                        onChange={(e) => handleChange('apiKey', e.target.value)}
                        fullWidth
                        required
                        type="password"
                    />
                    <TextField
                        label="Endpoint"
                        value={modelFormData.endpoint}
                        onChange={(e) => handleChange('endpoint', e.target.value)}
                        fullWidth
                        required
                        placeholder="https://your-endpoint.com"
                    />
                    <TextField
                        label="API路径"
                        value={modelFormData.apiPath}
                        onChange={(e) => handleChange('apiPath', e.target.value)}
                        fullWidth
                        helperText="自定义API格式时的请求路径，例如：/v1/chat/completions"
                        placeholder="/v1/chat/completions"
                    />
                    <TextField
                        label="请求头配置"
                        value={JSON.stringify(modelFormData.requestConfig?.headers || {}, null, 2)}
                        onChange={(e) => {
                            try {
                                const headers = JSON.parse(e.target.value);
                                setModelFormData({
                                    ...modelFormData,
                                    requestConfig: {
                                        ...modelFormData.requestConfig,
                                        headers
                                    }
                                });
                            } catch { }
                        }}
                        fullWidth
                        multiline
                        rows={3}
                        helperText="自定义请求头，JSON格式"
                        placeholder='{"Custom-Header": "value"}'
                    />
                    <TextField
                        label="请求参数配置"
                        value={JSON.stringify(modelFormData.requestConfig?.params || {}, null, 2)}
                        onChange={(e) => {
                            try {
                                const params = JSON.parse(e.target.value);
                                setModelFormData({
                                    ...modelFormData,
                                    requestConfig: {
                                        ...modelFormData.requestConfig,
                                        params
                                    }
                                });
                            } catch { }
                        }}
                        fullWidth
                        multiline
                        rows={3}
                        helperText="自定义URL参数，JSON格式"
                        placeholder='{"temperature": 0.7}'
                    />
                    <TextField
                        label="请求体模板"
                        value={JSON.stringify(modelFormData.requestConfig?.bodyTemplate || {}, null, 2)}
                        onChange={(e) => {
                            try {
                                const bodyTemplate = JSON.parse(e.target.value);
                                setModelFormData({
                                    ...modelFormData,
                                    requestConfig: {
                                        ...modelFormData.requestConfig,
                                        bodyTemplate
                                    }
                                });
                            } catch { }
                        }}
                        fullWidth
                        multiline
                        rows={3}
                        helperText="自定义请求体模板，JSON格式"
                        placeholder='{"temperature": 0.7, "max_tokens": 2000}'
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={onSave} variant="contained" color="primary">
                    保存
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModelDialog;