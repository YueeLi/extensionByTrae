import React from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    Typography,
    IconButton,
    Divider,
    Paper,
    Fab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';

interface ChatHistory {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
    messageCount: number;
}

const mockHistoryData: ChatHistory[] = [
    {
        id: '1',
        title: '关于React性能优化的讨论',
        lastMessage: '使用useMemo和useCallback可以有效避免不必要的重渲染...',
        timestamp: Date.now() - 1000 * 60 * 30, // 30分钟前
        messageCount: 12
    },
    {
        id: '2',
        title: 'TypeScript类型系统探讨',
        lastMessage: '泛型是TypeScript中最强大的特性之一，它可以...',
        timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2小时前
        messageCount: 8
    },
    {
        id: '3',
        title: '前端构建工具对比',
        lastMessage: 'Vite相比传统的webpack，在开发环境下的启动速度...',
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1天前
        messageCount: 15
    },
];

const HistoryPanel: React.FC = () => {
    const navigate = (page: 'chat' | 'settings' | 'history') => {
        const event = new CustomEvent('navigate', { detail: { page } });
        window.dispatchEvent(event);
    };

    const formatDate = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const date = new Date(timestamp);

        if (diff < 1000 * 60) { // 1分钟内
            return '刚刚';
        } else if (diff < 1000 * 60 * 60) { // 1小时内
            return `${Math.floor(diff / (1000 * 60))}分钟前`;
        } else if (diff < 1000 * 60 * 60 * 24) { // 24小时内
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 1000 * 60 * 60 * 24 * 7) { // 7天内
            return date.toLocaleDateString('zh-CN', { weekday: 'long' }) + ' ' +
                date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
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
                    历史对话
                </Typography>
                <Typography variant="body2" sx={{
                    color: '#666666',
                    mt: 1,
                    fontSize: '0.875rem',
                    opacity: 0.8
                }}>
                    查看和管理您的历史对话记录
                </Typography>
            </Box>

            <List
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 2,
                    '&::-webkit-scrollbar': {
                        width: '4px'
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '4px',
                        '&:hover': {
                            background: 'rgba(0, 0, 0, 0.2)'
                        }
                    }
                }}
            >
                {mockHistoryData.map((history, index) => (
                    <React.Fragment key={history.id}>
                        {index > 0 && <Divider sx={{ my: 1.5, opacity: 0.08 }} />}
                        <Paper
                            elevation={0}
                            sx={{
                                mb: 1,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid transparent',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    bgcolor: 'rgba(26, 127, 233, 0.04)',
                                    borderColor: 'rgba(26, 127, 233, 0.1)',
                                    boxShadow: '0 4px 20px rgba(26, 127, 233, 0.1)',
                                    '& .history-actions': {
                                        opacity: 1,
                                        transform: 'translateX(0)'
                                    }
                                }
                            }}
                        >
                            <ListItem
                                sx={{
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    p: 2
                                }}
                            >
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ChatIcon sx={{
                                                color: '#1A7FE9',
                                                fontSize: 20,
                                                filter: 'drop-shadow(0 2px 4px rgba(26, 127, 233, 0.2))'
                                            }} />
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    color: '#1A1A1A',
                                                    fontWeight: 600,
                                                    fontSize: '0.95rem',
                                                    letterSpacing: '-0.01em'
                                                }}
                                            >
                                                {history.title}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ mt: 1.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#666666',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    lineHeight: 1.6,
                                                    fontSize: '0.875rem',
                                                    opacity: 0.85
                                                }}
                                            >
                                                {history.lastMessage}
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    mt: 1.5
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: '#999999',
                                                        fontSize: '0.75rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5
                                                    }}
                                                >
                                                    {formatDate(history.timestamp)} · {history.messageCount}条对话
                                                </Typography>
                                                <Box
                                                    className="history-actions"
                                                    sx={{
                                                        opacity: 0,
                                                        transform: 'translateX(10px)',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        sx={{
                                                            color: '#666666',
                                                            transition: 'all 0.2s ease',
                                                            '&:hover': {
                                                                color: '#d32f2f',
                                                                bgcolor: 'rgba(211, 47, 47, 0.08)',
                                                                transform: 'scale(1.1)'
                                                            }
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Box>
                                            </Box>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    </React.Fragment>
                ))}
            </List>
            <Fab
                color="primary"
                aria-label="新建对话"
                onClick={() => navigate('chat')}
                sx={{
                    position: 'fixed',
                    right: 32,
                    bottom: 32,
                    bgcolor: '#1A7FE9',
                    boxShadow: '0 8px 16px rgba(26, 127, 233, 0.25)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        bgcolor: '#1565C0',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 12px rgba(26, 127, 233, 0.3)'
                    }
                }}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default HistoryPanel;