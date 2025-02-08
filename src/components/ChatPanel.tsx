import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, IconButton, Typography, List, ListItem, Button, CircularProgress, Checkbox, FormGroup, FormControlLabel, Collapse } from '@mui/material';
import { Alert, Snackbar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MicIcon from '@mui/icons-material/Mic';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Message, MessageContent } from '../types/message';
import { ModelConfig } from '../types/model';
import { MultiModelSession } from '../types/multi-model';
import TemplateDialog from './TemplateDialog';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatPanelProps {
    models: ModelConfig[];
    onSendMessage: (modelIds: string[], content: string) => Promise<void>;
    currentSession?: MultiModelSession;
    isMultiModel?: boolean;
    selectedModels: string[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    models,
    onSendMessage,
    currentSession,
    isMultiModel = false,
    selectedModels
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

    const toggleExpand = (modelId: string) => {
        setExpandedModels(prev => ({
            ...prev,
            [modelId]: !prev[modelId]
        }));
    };
    const [attachment, setAttachment] = useState<{
        type: 'image' | 'text' | 'pdf';
        content: string;
        name: string;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = () => {
        chrome.storage.local.get(['chatHistory'], (result) => {
            if (result.chatHistory) {
                setMessages(result.chatHistory);
            }
        });
    };

    const clearChatHistory = () => {
        chrome.storage.local.remove(['chatHistory'], () => {
            setMessages([]);
        });
    };

    const handleOpenTemplates = () => {
        setIsTemplateDialogOpen(true);
    };

    const handleCloseTemplates = () => {
        setIsTemplateDialogOpen(false);
    };

    const handleSelectTemplate = (content: string) => {
        setInputValue(content);
    };

    const handleExportChat = () => {
        // 将对话记录转换为文本格式
        const chatText = messages.map(message => {
            const timestamp = new Date(message.timestamp).toLocaleString('zh-CN');
            const role = message.isUser ? '用户' : 'AI助手';
            const content = message.content.map(item => item.text).join('\n');
            return `[${timestamp}] ${role}:\n${content}\n`;
        }).join('\n');

        // 创建Blob对象
        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接并触发下载
        const link = document.createElement('a');
        link.href = url;
        link.download = `对话记录_${new Date().toLocaleDateString()}.txt`;
        document.body.appendChild(link);
        link.click();

        // 清理
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (messages.length > 0) {
            chrome.storage.local.set({
                chatHistory: messages.slice(-50) // 增加保存的消息数量到50条
            });
        }
    }, [messages]);
    const [inputValue, setInputValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError(`文件大小超出限制（最大${Math.floor(maxSize / 1024 / 1024)}MB）`);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        try {
            let fileType: 'image' | 'text' | 'pdf';
            let content = '';

            if (file.type.startsWith('image/')) {
                fileType = 'image';
                content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('文件读取失败'));
                    reader.readAsDataURL(file);
                });
            } else if (file.type === 'application/pdf' || file.type.includes('text') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                fileType = file.type === 'application/pdf' ? 'pdf' : 'text';
                content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('文件读取失败'));
                    reader.readAsText(file);
                });
            } else {
                throw new Error('不支持的文件格式，请上传图片、PDF或文本文件');
            }

            setAttachment({
                type: fileType,
                content: content,
                name: file.name
            });

        } catch (error) {
            setError(error instanceof Error ? error.message : '文件处理失败，请重试');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const [isSending, setIsSending] = useState(false);
    const debounceTimeout = useRef<NodeJS.Timeout>();
    const [inputContent, setContent] = useState<MessageContent[]>([]);

    const handleSendMessage = async () => {
        if (isSending) {
            setError('正在发送中');
            return;
        }

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(async () => {
            setIsSending(true);
            setError(null);

            if (!inputValue.trim()) {
                setError(attachment ? '请输入文字描述后再发送文件' : '请输入要发送的内容');
                setIsSending(false);
                return;
            }

            const newContent = [...inputContent];

            if (attachment) {
                if (attachment.type === 'image') {
                    newContent.push({
                        type: 'image_url',
                        image_url: {
                            url: attachment.content,
                            detail: 'low'
                        }
                    });
                } else {
                    newContent.push({
                        type: 'file',
                        file: {
                            url: attachment.content,
                            detail: 'low'
                        }
                    });
                }
            }

            newContent.push({
                type: 'text',
                text: inputValue
            });

            try {
                const newMessage = {
                    id: Date.now().toString(),
                    content: newContent,
                    isUser: true,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, newMessage]);

                await onSendMessage(selectedModels, inputValue);

                // 多模型对话不再将响应添加到消息列表中
                if (!isMultiModel) {
                    if (currentSession?.modelResponses) {
                        const aiMessages = currentSession.modelResponses
                            .filter(response => response.status === 'success')
                            .map(response => ({
                                id: `${response.modelId}-${Date.now()}`,
                                content: Array.isArray(response.response.content)
                                    ? response.response.content
                                    : [{ type: 'text', text: response.response.content }],
                                isUser: false,
                                timestamp: Date.now()
                            }));

                        setMessages(prev => [...prev, ...aiMessages]);
                    }
                }

                setInputValue('');
                setAttachment(null);
                setContent([]);
            } catch (error) {
                setError(error instanceof Error ? error.message : '发送消息失败');
            } finally {
                setIsSending(false);
            }
        }, 300);
    };

    return (
        <Box
            role="main"
            aria-live="polite"
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: '100%',
                minWidth: '400px',
                maxWidth: '1200px',
                margin: '0 auto',
                bgcolor: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
            <List sx={{
                flex: 1,
                overflow: 'auto',
                padding: '24px',
                bgcolor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                '& .MuiListItem-root': {
                    padding: '4px 0',
                    transition: 'all 0.3s ease'
                },
                '&::-webkit-scrollbar': {
                    width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                    background: '#F5F5F5',
                    borderRadius: '3px'
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#E0E0E0',
                    borderRadius: '3px',
                    '&:hover': {
                        background: '#BDBDBD'
                    }
                }
            }}>
                {/* 多模型会话展示 */}
                {isMultiModel && currentSession && currentSession.question && currentSession.question.content && (
                    <Box sx={{ mb: 2 }}>
                        <Paper sx={{ p: 2, mb: 2, bgcolor: '#E3F2FD' }}>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                问题
                            </Typography>
                            <Typography>
                                {currentSession.question.content.map((item, index) => (
                                    item.type === 'text' && <span key={index}>{item.text}</span>
                                ))}
                            </Typography>
                        </Paper>

                        <Box sx={{ display: 'grid', gridTemplateColumns: isMultiModel ? 'repeat(3, 1fr)' : '1fr', gap: 2, mb: 2 }}>
                            {currentSession?.modelResponses?.map((response) => (
                                <Paper key={response.modelId} sx={{
                                    p: 2,
                                    bgcolor: '#FFFFFF',
                                    borderRadius: 2,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#1A1A1A' }}>
                                            {response.modelName}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleExpand(response.modelId)}
                                            sx={{
                                                color: '#666666',
                                                '&:hover': { color: '#1A7FE9' }
                                            }}
                                        >
                                            {expandedModels[response.modelId] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>

                                    {response.status === 'pending' && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    )}

                                    {response.status === 'error' && (
                                        <Alert severity="error" sx={{ mb: 1 }}>
                                            {response.error || '请求失败'}
                                        </Alert>
                                    )}

                                    <Collapse in={expandedModels[response.modelId] || false}>
                                        {response.status === 'success' && (
                                            <Box>
                                                {typeof response.response.content === 'string' ? (
                                                    <MarkdownRenderer
                                                        content={response.response.content}
                                                        textColor="#1A1A1A"
                                                    />
                                                ) : response.response.content?.map((item, index) => (
                                                    <Box key={index}>
                                                        {item.type === 'text' && (
                                                            <MarkdownRenderer
                                                                content={item.text || ''}
                                                                textColor="#1A1A1A"
                                                            />
                                                        )}
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Collapse>
                                </Paper>
                            ))}
                        </Box>
                    </Box>
                )}
                <Box sx={{ flexGrow: 1 }}>
                    {messages.map(message => (
                        <ListItem
                            key={message.id}
                            sx={{
                                display: 'flex',
                                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                                padding: 1
                            }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    padding: '12px 16px',
                                    maxWidth: '75%',
                                    bgcolor: message.isUser ? '#1A7FE9' : '#F0F2F5',
                                    color: message.isUser ? '#FFFFFF' : '#1A1A1A',
                                    borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    boxShadow: 'none',
                                    position: 'relative',
                                    '&::before': message.isUser ? {
                                        content: '""',
                                        position: 'absolute',
                                        right: '-8px',
                                        bottom: 0,
                                        width: 0,
                                        height: 0,
                                        borderStyle: 'solid',
                                        borderWidth: '0 0 8px 8px',
                                        borderColor: `transparent transparent ${message.isUser ? '#1A7FE9' : '#F0F2F5'} transparent`
                                    } : {}
                                }}
                            >
                                {message.content && message.content.map((item, index) => (
                                    <Box key={index}>
                                        {item.type === 'text' && (
                                            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                                                {item.text || ''}
                                            </Typography>
                                        )}
                                        {item.type === 'image_url' && item.image_url && (
                                            <Box sx={{ mt: 1 }}>
                                                <img
                                                    src={item.image_url.url}
                                                    alt={item.image_url.detail}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '300px',
                                                        borderRadius: '8px',
                                                        objectFit: 'contain'
                                                    }}
                                                    loading="lazy"
                                                />
                                            </Box>
                                        )}
                                        {item.type === 'file' && item.file && (
                                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                                                文件：{item.file.detail}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        mt: 1,
                                        textAlign: message.isUser ? 'right' : 'left',
                                        color: message.isUser ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Typography>
                            </Paper>
                        </ListItem>
                    ))}
                    <div ref={messagesEndRef} />
                </Box>
            </List>
            <Box sx={{
                p: 0.8,
                bgcolor: '#FFFFFF',
                borderTop: '1px solid #E5E5E5',
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
            }}>
                <Box sx={{
                    display: 'flex',
                    gap: 0.25,
                    mb: 1,
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #E5E5E5',
                    pb: 0.5
                }}>
                    <Box sx={{ display: 'flex', gap: 0.25 }}>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<FileDownloadIcon sx={{ fontSize: 20 }} />}
                            onClick={handleExportChat}
                            sx={{
                                minWidth: 'auto',
                                padding: '4px 10px',
                                color: '#666666',
                                fontSize: '12px',
                                fontWeight: 400,
                                '&:hover': {
                                    color: '#1A7FE9',
                                    bgcolor: 'rgba(26, 127, 233, 0.04)'
                                }
                            }}
                        >
                            导出对话
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<AutoAwesomeIcon sx={{ fontSize: 20 }} />}
                            onClick={handleOpenTemplates}
                            sx={{
                                minWidth: 'auto',
                                padding: '4px 10px',
                                color: '#666666',
                                fontSize: '12px',
                                fontWeight: 400,
                                '&:hover': {
                                    color: '#1A7FE9',
                                    bgcolor: 'rgba(26, 127, 233, 0.04)'
                                }
                            }}
                        >
                            模板
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<MicIcon sx={{ fontSize: 20 }} />}
                            sx={{
                                minWidth: 'auto',
                                padding: '4px 10px',
                                color: '#666666',
                                fontSize: '12px',
                                fontWeight: 400,
                                '&:hover': {
                                    color: '#1A7FE9',
                                    bgcolor: 'rgba(26, 127, 233, 0.04)'
                                }
                            }}
                        >
                            语音输入
                        </Button>
                    </Box>
                    <Box>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<DeleteSweepIcon sx={{ fontSize: 20 }} />}
                            onClick={clearChatHistory}
                            sx={{
                                minWidth: 'auto',
                                padding: '4px 10px',
                                color: '#666666',
                                fontSize: '12px',
                                fontWeight: 400,
                                '&:hover': {
                                    color: '#1A7FE9',
                                    bgcolor: 'rgba(26, 127, 233, 0.04)'
                                }
                            }}
                        >
                            清空对话
                        </Button>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', position: 'relative', flexWrap: 'wrap' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.txt,.doc,.docx"
                        style={{ display: 'none' }}
                    />
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="输入消息..."
                        value={inputValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setInputValue(event.target.value);
                        }}
                        disabled={isSending}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                backgroundColor: '#F5F5F5',
                                '&:hover': {
                                    backgroundColor: '#EEEEEE'
                                },
                                '&.Mui-focused': {
                                    backgroundColor: '#FFFFFF'
                                }
                            }
                        }}
                    />
                    <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            color: '#666666',
                            padding: '8px',
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            '&:hover': {
                                color: '#1A7FE9',
                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                            }
                        }}
                    >
                        <AttachFileIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton
                        onClick={handleSendMessage}
                        disabled={isSending}
                        sx={{
                            color: '#1A7FE9',
                            padding: '8px',
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            '&:hover': {
                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                            },
                            '&.Mui-disabled': {
                                color: 'rgba(26, 127, 233, 0.3)'
                            }
                        }}
                    >
                        <SendIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Box>
            </Box>
            <TemplateDialog
                open={isTemplateDialogOpen}
                onClose={handleCloseTemplates}
                onSelectTemplate={handleSelectTemplate}
            />
        </Box>
    );
};

export default ChatPanel;