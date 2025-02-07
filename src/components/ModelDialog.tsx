import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ModelConfig } from '../types/types';

interface ModelDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: () => void;
    modelFormData: ModelConfig;
    setModelFormData: React.Dispatch<React.SetStateAction<ModelConfig>>;
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
    const handleChange = (field: keyof ModelConfig, value: any) => {
        setModelFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{editingModel ? '编辑模型' : '添加模型'}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>基础配置</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <TextField
                                    label="模型名称"
                                    value={modelFormData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="模型标识"
                                    value={modelFormData.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    required
                                    fullWidth
                                />
                                <FormControl fullWidth required>
                                    <InputLabel>API格式</InputLabel>
                                    <Select
                                        value={modelFormData.apiFormat}
                                        onChange={(e) => handleChange('apiFormat', e.target.value)}
                                        label="API格式"
                                    >
                                        <MenuItem value="azure">Azure OpenAI</MenuItem>
                                        <MenuItem value="openai">OpenAI</MenuItem>
                                        <MenuItem value="custom">自定义</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>API配置</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <TextField
                                    label="Deployment Name"
                                    value={modelFormData.deploymentName}
                                    onChange={(e) => handleChange('deploymentName', e.target.value)}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="API版本"
                                    value={modelFormData.apiVersion}
                                    onChange={(e) => handleChange('apiVersion', e.target.value)}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="API密钥"
                                    value={modelFormData.apiKey}
                                    onChange={(e) => handleChange('apiKey', e.target.value)}
                                    required
                                    fullWidth
                                    type="password"
                                />
                                <TextField
                                    label="API端点"
                                    value={modelFormData.endpoint}
                                    onChange={(e) => handleChange('endpoint', e.target.value)}
                                    required
                                    fullWidth
                                    placeholder="https://your-resource.openai.azure.com"
                                />
                                {modelFormData.apiFormat === 'custom' && (
                                    <TextField
                                        label="API路径"
                                        value={modelFormData.apiPath}
                                        onChange={(e) => handleChange('apiPath', e.target.value)}
                                        required
                                        fullWidth
                                        placeholder="/v1/chat/completions"
                                    />
                                )}
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>模型参数配置（可选）</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <TextField
                                    label="Temperature"
                                    type="number"
                                    value={modelFormData.temperature || ''}
                                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                                    fullWidth
                                    inputProps={{ step: 0.1, min: 0, max: 1 }}
                                    helperText="控制输出的随机性 (0-1)"
                                />
                                <TextField
                                    label="Max Tokens"
                                    type="number"
                                    value={modelFormData.max_tokens || ''}
                                    onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
                                    fullWidth
                                    helperText="生成文本的最大长度(旧api)"
                                />
                                <TextField
                                    label="Max Completion Tokens"
                                    type="number"
                                    value={modelFormData.max_completion_tokens || ''}
                                    onChange={(e) => handleChange('max_completion_tokens', parseInt(e.target.value))}
                                    fullWidth
                                    helperText="生成文本的最大长度(新api)"
                                />
                                <TextField
                                    label="Top P"
                                    type="number"
                                    value={modelFormData.top_p || ''}
                                    onChange={(e) => handleChange('top_p', parseFloat(e.target.value))}
                                    fullWidth
                                    inputProps={{ step: 0.1, min: 0, max: 1 }}
                                    helperText="控制输出的多样性 (0-1)"
                                />
                                <TextField
                                    label="Frequency Penalty"
                                    type="number"
                                    value={modelFormData.frequency_penalty || ''}
                                    onChange={(e) => handleChange('frequency_penalty', parseFloat(e.target.value))}
                                    fullWidth
                                    inputProps={{ step: 0.1, min: -2, max: 2 }}
                                    helperText="控制重复词汇的惩罚程度 (-2.0-2.0)"
                                />
                                <TextField
                                    label="Presence Penalty"
                                    type="number"
                                    value={modelFormData.presence_penalty || ''}
                                    onChange={(e) => handleChange('presence_penalty', parseFloat(e.target.value))}
                                    fullWidth
                                    inputProps={{ step: 0.1, min: -2, max: 2 }}
                                    helperText="控制话题重复的惩罚程度 (-2.0-2.0)"
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={onSave} variant="contained" color="primary">保存</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModelDialog;