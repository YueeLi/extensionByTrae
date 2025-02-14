import React, { useState, useEffect } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    Typography,
    IconButton,
    Divider,
    Paper,
    Fab,
    TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';

interface ChatHistory {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
    messagesCount: number;
    isPinned?: boolean;
}

const HistoryPanel: React.FC = () => {
    const [sessions, setSessions] = useState<ChatHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const navigate = (page: 'chat' | 'settings' | 'history') => {
        const event = new CustomEvent('navigate', { detail: { page } });
        window.dispatchEvent(event);
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'getSessions'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const formattedSessions = response.sessions.map((session: any) => ({
                id: session.id,
                title: session.title || '新对话',
                lastMessage: session.lastMessage || '暂无消息',
                timestamp: session.timestamp || Date.now(),
                messagesCount: session.messagesCount || 0,
                isPinned: session.isPinned || false
            }));

            const sortedSessions = formattedSessions.sort((a: ChatHistory, b: ChatHistory) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.timestamp - a.timestamp;
            });

            setSessions(sortedSessions);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载会话失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRenameSession = async (sessionId: string) => {
        if (!editingTitle.trim()) {
            setEditingSessionId(null);
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'updateSessionTitle',
                session: {
                    id: sessionId,
                    title: editingTitle.trim()
                }
            });

            loadSessions();
            setEditingSessionId(null);
            setEditingTitle('');
        } catch (err) {
            setError('重命名会话失败');
        }
    };

    const handleTogglePin = async (sessionId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'toggleSessionPin',
                session: { id: sessionId }
            });
            loadSessions();
        } catch (err) {
            setError('置顶操作失败');
        }
    };

    const handleSessionClick = async (sessionId: string) => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'setCurrentSession',
                session: { id: sessionId }
            });

            if (response.error) {
                throw new Error(response.error);
            }

            if (response.success) {
                navigate('chat');
            } else {
                throw new Error('会话切换失败');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '切换会话失败');
            console.error('切换会话失败:', err);
        }
    };

    const handleCreateSession = async () => {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'createSession'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            navigate('chat');
        } catch (err) {
            setError('创建新会话失败');
        }
    };

    const handleDeleteSession = async (sessionId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'deleteSession',
                session: { id: sessionId }
            });
            loadSessions();
        } catch (err) {
            setError('删除会话失败');
        }
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
                    历史会话
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
                {sessions.map((history, index) => (
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
                                bgcolor: history.isPinned ? 'rgba(26, 127, 233, 0.04)' : 'transparent',
                                borderLeft: history.isPinned ? '4px solid #1A7FE9' : '1px solid transparent',
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
                                onClick={() => handleSessionClick(history.id)}
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
                                                {editingSessionId === history.id ? (
                                                    <TextField
                                                        autoFocus
                                                        fullWidth
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onBlur={() => handleRenameSession(history.id)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleRenameSession(history.id);
                                                            }
                                                        }}
                                                        size="small"
                                                        onClick={(e) => e.stopPropagation()}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                fontSize: '0.95rem',
                                                                '& fieldset': {
                                                                    borderColor: 'rgba(26, 127, 233, 0.2)'
                                                                },
                                                                '&:hover fieldset': {
                                                                    borderColor: 'rgba(26, 127, 233, 0.4)'
                                                                },
                                                                '&.Mui-focused fieldset': {
                                                                    borderColor: '#1A7FE9'
                                                                }
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    history.title
                                                )}
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
                                                    {formatDate(history.timestamp)} · {history.messagesCount}条对话
                                                </Typography>
                                                <Box
                                                    className="history-actions"
                                                    sx={{
                                                        opacity: 0,
                                                        transform: 'translateX(10px)',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        display: 'flex',
                                                        gap: 1
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingSessionId(history.id);
                                                            setEditingTitle(history.title);
                                                        }}
                                                        sx={{
                                                            color: '#666666',
                                                            transition: 'all 0.2s ease',
                                                            '&:hover': {
                                                                color: '#1A7FE9',
                                                                bgcolor: 'rgba(26, 127, 233, 0.08)',
                                                                transform: 'scale(1.1)'
                                                            }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleTogglePin(history.id, e)}
                                                        sx={{
                                                            color: history.isPinned ? '#1A7FE9' : '#666666',
                                                            transition: 'all 0.2s ease',
                                                            '&:hover': {
                                                                color: '#1A7FE9',
                                                                bgcolor: 'rgba(26, 127, 233, 0.08)',
                                                                transform: 'scale(1.1)'
                                                            }
                                                        }}
                                                    >
                                                        <PushPinIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleDeleteSession(history.id, e)}
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
                onClick={handleCreateSession}
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