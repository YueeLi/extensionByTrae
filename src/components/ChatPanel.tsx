import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, IconButton, Typography, List, ListItem, Button, CircularProgress } from '@mui/material';
import { Alert, Snackbar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MicIcon from '@mui/icons-material/Mic';
import html2canvas from 'html2canvas';

import { Message, MessageContent } from '../types';
import TemplateDialog from './TemplateDialog';
import MarkdownRenderer from './MarkdownRenderer';

const ChatPanel: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
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

        if (file.size > 10 * 1024 * 1024) {
            const errorMessage: Message = {
                id: Date.now().toString(),
                content: [{
                    type: 'text',
                    text: '错误：文件大小超出限制（最大10MB）'
                }],
                isUser: false,
                timestamp: Date.now(),
                role: 'system'
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        try {
            let fileType: 'image' | 'text' | 'pdf';
            let content = '';

            if (file.type.startsWith('image/')) {
                fileType = 'image';
                content = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            } else if (file.type === 'application/pdf' || file.type.includes('text') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                fileType = file.type === 'application/pdf' ? 'pdf' : 'text';
                content = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsText(file);
                });
            } else {
                throw new Error('不支持的文件格式');
            }

            // 存储文件信息，等待用户输入文字后一起发送
            setAttachment({
                type: fileType,
                content: content,
                name: file.name
            });

        } catch (error) {
            const errorMessage: Message = {
                id: Date.now().toString(),
                content: [{
                    type: 'text',
                    text: `错误：${error instanceof Error ? error.message : '文件处理失败，请重试'}`
                }],
                isUser: false,
                timestamp: Date.now(),
                role: 'system'
            };
            setMessages(prev => [...prev, errorMessage]);
            setError(error instanceof Error ? error.message : '未知错误');
        } finally {
            setIsLoading(false);
        }

        // 清除文件输入，以便可以重新上传相同的文件
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const [isSending, setIsSending] = useState(false);
    const debounceTimeout = useRef<NodeJS.Timeout>();
    const [inputContent, setContent] = useState<MessageContent[]>([]);

    const handleSendMessage = async () => {
        if (isSending || isLoading) return;

        // 清除之前的debounce定时器
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // 设置新的debounce定时器
        debounceTimeout.current = setTimeout(async () => {
            setIsLoading(true);
            setIsSending(true);
            setError(null);

            // 如果没有输入文字，显示提示信息
            if (!inputValue.trim()) {
                if (attachment) {
                    setError('请输入文字描述后再发送文件');
                } else {
                    setError('请输入要发送的内容');
                }
                setIsLoading(false);
                setIsSending(false);
                return;
            }

            // 封装content
            if (attachment) {
                inputContent.push({
                    type: attachment.type,
                    text: attachment.content
                });
            }
            inputContent.push({
                type: 'text',
                text: inputValue
            })

            setContent(inputContent);

            const userMessage: Message = {
                id: Date.now().toString(),
                content: inputContent,
                isUser: true,
                timestamp: Date.now(),
                role: 'user'
            };

            setMessages(prev => [...prev, userMessage]);
            setInputValue('');
            setAttachment(null);

            try {
                // 创建一个临时的 AI 消息用于流式展示
                const tempAiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: [{
                        type: 'text',
                        text: ''
                    }],
                    isUser: false,
                    timestamp: Date.now(),
                    role: 'assistant'
                };

                setMessages(prev => [...prev, tempAiMessage]);

                const response = await chrome.runtime.sendMessage({
                    type: 'chat',
                    text: inputValue,
                    content: userMessage.content
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                // 更新临时消息的内容
                setMessages(prev => prev.map(msg =>
                    msg.id === tempAiMessage.id
                        ? {
                            ...msg,
                            content: [{
                                type: 'text',
                                text: typeof response === 'string' ? response : response.content || '无响应内容'
                            }]
                        }
                        : msg
                ));
            } catch (error) {
                const errorMessage: Message = {
                    id: Date.now().toString(),
                    content: [{
                        type: 'text',
                        text: `错误：${error instanceof Error ? error.message : '未知错误'}`
                    }],
                    isUser: false,
                    timestamp: Date.now(),
                    role: 'system'
                };
                setMessages(prev => [...prev, errorMessage]);
                setError(error instanceof Error ? error.message : '未知错误');
            } finally {
                setIsLoading(false);
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
            {isLoading && (
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1000,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    padding: 2,
                    borderRadius: 1
                }}>
                    <CircularProgress />
                </Box>
            )}
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
                                    maxWidth: '70%',
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
                                {message.content.map((item, index) => (
                                    <Box key={index}>
                                        {item.type === 'text' && (
                                            <MarkdownRenderer
                                                content={item.text || ''}
                                                textColor={message.isUser ? '#FFFFFF' : '#1A1A1A'}
                                            />
                                        )}
                                        {item.type === 'image_url' && item.image_url && (
                                            <Box sx={{ mt: 1 }}>
                                                <img
                                                    src={item.image_url.url}
                                                    alt={item.image_url.detail}
                                                    style={{ maxWidth: '100%', maxHeight: '200px' }}
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
                                {message.attachment && (
                                    <Box sx={{ mt: 1 }}>
                                        {message.attachment.type === 'image' && (
                                            <img
                                                src={message.attachment.content}
                                                alt={message.attachment.name}
                                                style={{ maxWidth: '100%', maxHeight: '200px' }}
                                            />
                                        )}
                                        {(message.attachment.type === 'text' || message.attachment.type === 'pdf') && (
                                            <Typography variant="caption" color="textSecondary">
                                                附件：{message.attachment.name}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
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
                            提示词模板
                        </Button>
                        <Button
                            variant="text"
                            size="small"
                            startIcon={<MicIcon sx={{ fontSize: 20 }} />}
                            onClick={() => { }}
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
                            语音模式
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
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: '#F8F9FA',
                                '& fieldset': {
                                    borderColor: '#E5E5E5'
                                },
                                '&:hover fieldset': {
                                    borderColor: '#1A7FE9'
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1A7FE9'
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