import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, TextField, IconButton, Typography, List, ListItem, Button, CircularProgress } from '@mui/material';
import { Alert, Snackbar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import { Message } from '../types';

const ChatPanel: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
                content,
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
                    setIsLoading(false);
                    setIsSending(false);
                    return;
                }
                setIsLoading(false);
                setIsSending(false);
                return;
            }

            const userMessage: Message = {
                id: Date.now().toString(),
                content: [{
                    type: 'text',
                    text: inputValue
                }],
                isUser: true,
                timestamp: Date.now(),
                role: 'user',
                attachment: attachment
            };

            setMessages(prev => [...prev, userMessage]);
            setInputValue('');
            setAttachment(null);

            try {
                const response = await chrome.runtime.sendMessage({
                    type: 'chat',
                    text: inputValue + (attachment ? `\n文件内容：${attachment.content}` : ''),
                    fileType: attachment?.type
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                const aiMessage: Message = {
                    id: Date.now().toString(),
                    content: [{
                        type: 'text',
                        text: typeof response === 'string' ? response : response.content || '无响应内容'
                    }],
                    isUser: false,
                    timestamp: Date.now(),
                    role: 'assistant'
                };

                setMessages(prev => [...prev, aiMessage]);
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
        <Box sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            minWidth: '320px',
            maxWidth: '1200px',
            margin: '0 auto',
            bgcolor: '#FFFFFF',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'
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
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: '12px 20px',
                borderBottom: '1px solid #E5E5E5',
                bgcolor: '#FFFFFF'
            }}>
                <IconButton
                    onClick={() => window.history.back()}
                    sx={{
                        color: '#666666',
                        '&:hover': {
                            color: '#1A7FE9',
                            bgcolor: 'rgba(26, 127, 233, 0.04)'
                        }
                    }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={clearChatHistory}
                    sx={{
                        mr: 1,
                        borderColor: '#E5E5E5',
                        color: '#666666',
                        '&:hover': {
                            borderColor: '#1A7FE9',
                            color: '#1A7FE9',
                            bgcolor: 'rgba(26, 127, 233, 0.04)'
                        }
                    }}
                >
                    清除历史记录
                </Button>
            </Box>
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
                '& .MuiListItem-root': {
                    padding: '8px 0',
                    marginBottom: '8px'
                },
                '&::-webkit-scrollbar': {
                    width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                    background: '#F1F1F1'
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#BDBDBD',
                    borderRadius: '3px',
                    '&:hover': {
                        background: '#A1A1A1'
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
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    p: ({ children }) => <Typography variant="body1" sx={{ mb: 1 }}>{children}</Typography>,
                                                    h1: ({ children }) => <Typography variant="h4" sx={{ mb: 2, mt: 2 }}>{children}</Typography>,
                                                    h2: ({ children }) => <Typography variant="h5" sx={{ mb: 1.5, mt: 1.5 }}>{children}</Typography>,
                                                    h3: ({ children }) => <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>{children}</Typography>,
                                                    ul: ({ children }) => <Box component="ul" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                                                    ol: ({ children }) => <Box component="ol" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                                                    li: ({ children }) => <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>,
                                                    blockquote: ({ children }) => (
                                                        <Box
                                                            sx={{
                                                                borderLeft: '4px solid #1A7FE9',
                                                                pl: 2,
                                                                py: 1,
                                                                my: 1,
                                                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                                                            }}
                                                        >
                                                            {children}
                                                        </Box>
                                                    )
                                                }}
                                            >
                                                {item.text}
                                            </ReactMarkdown>
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
                p: 2,
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
            }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.txt,.doc,.docx"
                        style={{ display: 'none' }}
                    />
                    <IconButton
                        color="primary"
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            alignSelf: 'flex-end',
                            color: '#1A7FE9',
                            '&:hover': {
                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                            }
                        }}
                    >
                        <AttachFileIcon />
                    </IconButton>
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
                        multiline
                        maxRows={4}
                        size="small"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: '#F7F7F8',
                                borderRadius: '12px',
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
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                        sx={{
                            alignSelf: 'flex-end',
                            color: '#1A7FE9',
                            '&:hover': {
                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                            },
                            '&.Mui-disabled': {
                                color: '#E5E5E5'
                            }
                        }}
                    >
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatPanel;