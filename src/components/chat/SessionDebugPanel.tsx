import React, { useEffect, useState } from 'react';
import { Session } from '../../types/types';
import { Box, Typography, Paper, Alert, List, ListItem, ListItemText, Button, Divider } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface SessionDebugPanelProps {
    visible: boolean;
}

const SessionDebugPanel: React.FC<SessionDebugPanelProps> = ({ visible }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [storageInfo, setStorageInfo] = useState<{ bytesInUse?: number }>({});
    const [error, setError] = useState<string | null>(null);

    const loadDebugInfo = async () => {
        try {
            // 获取所有会话
            const response = await chrome.runtime.sendMessage({
                type: 'session',
                operate: 'getSessions'
            });

            if (response.error) {
                throw new Error(response.error);
            }

            setSessions(response.sessions);

            // 获取存储使用情况
            const bytesInUse = await chrome.storage.local.getBytesInUse(['sessions']);
            setStorageInfo({ bytesInUse });
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载调试信息失败');
        }
    };

    useEffect(() => {
        if (visible) {
            loadDebugInfo();
        }
    }, [visible]);

    if (!visible) return null;

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
                    fontSize: '1.1rem'
                }}>
                    会话调试面板
                </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {error && (
                    <Alert
                        severity="error"
                        onClose={() => setError(null)}
                        sx={{ mb: 3 }}
                    >
                        {error}
                    </Alert>
                )}

                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 3,
                        border: '1px solid #E5E5E5',
                        borderRadius: 2
                    }}
                >
                    <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                        存储信息
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        已使用存储空间: {((storageInfo.bytesInUse || 0) / 1024).toFixed(2)} KB
                    </Typography>
                </Paper>

                <Paper
                    elevation={0}
                    sx={{
                        border: '1px solid #E5E5E5',
                        borderRadius: 2
                    }}
                >
                    <Box sx={{ p: 2, borderBottom: '1px solid #E5E5E5' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            会话列表 ({sessions.length})
                        </Typography>
                    </Box>
                    <List sx={{ p: 0 }}>
                        {sessions.map((session, index) => (
                            <React.Fragment key={session.id}>
                                {index > 0 && <Divider />}
                                <ListItem sx={{ px: 2, py: 1.5 }}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                                {session.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box sx={{ mt: 0.5 }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    ID: {session.id}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    消息数: {session.messagesCount}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    最后更新: {new Date(session.timestamp).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={loadDebugInfo}
                    startIcon={<RefreshIcon />}
                    sx={{
                        bgcolor: '#1A7FE9',
                        '&:hover': { bgcolor: '#1565C0' }
                    }}
                >
                    刷新
                </Button>
            </Box>
        </Box>
    );
};

export default SessionDebugPanel;