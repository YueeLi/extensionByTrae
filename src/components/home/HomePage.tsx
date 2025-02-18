import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Typography, Divider } from '@mui/material';
import ChatPanel from '../chat/ChatPanel';
import SettingsPanel from '../setting/SettingsPanel';
import HistoryPanel from '../chat/HistoryPanel';
import HistoryIcon from '@mui/icons-material/History';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ImageIcon from '@mui/icons-material/Image';
import TerminalIcon from '@mui/icons-material/Terminal';
import TranslateIcon from '@mui/icons-material/Translate';
import BugReportIcon from '@mui/icons-material/BugReport';
import SessionDebugPanel from '../chat/SessionDebugPanel';

const DRAWER_WIDTH = 56;

const HomePage: React.FC = () => {
    const [currentPage, setCurrentPage] = React.useState<'chat' | 'settings' | 'debug' | 'history'>('history');

    React.useEffect(() => {
        const handleNavigate = (event: CustomEvent<{ page: 'chat' | 'settings' | 'history' }>) => {
            setCurrentPage(event.detail.page);
        };

        window.addEventListener('navigate', handleNavigate as EventListener);

        return () => {
            window.removeEventListener('navigate', handleNavigate as EventListener);
        };
    }, []);

    const menuItems = [
        // 会话相关
        { id: 'history', icon: <HistoryIcon />, text: '历史会话' },
        { id: 'chat', icon: <ChatIcon />, text: '开始对话' },
        { type: 'divider' },
        // AI助手
        { id: 'image', icon: <ImageIcon />, text: '图像助手' },
        { id: 'translate', icon: <TranslateIcon />, text: '智能翻译' },
        { id: 'vms', icon: <TerminalIcon />, text: 'vm管理' },
        { type: 'divider' },
        // 系统设置
        { id: 'settings', icon: <SettingsIcon />, text: 'AI模型' },
        { id: 'debug', icon: <BugReportIcon />, text: '插件后台' }
    ];

    return (
        <Box sx={{ height: '100%', minWidth: '400px', display: 'flex' }}>
            <Drawer
                variant="permanent"
                anchor="left"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: '#F0F7FF',
                        borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.05)',
                        overflowX: 'hidden',
                        background: 'linear-gradient(180deg, #F0F7FF 0%, #E6F0FF 100%)'
                    }
                }}
            >
                <Box sx={{
                    p: 2,
                    height: '56px',
                    display: 'grid',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    background: 'linear-gradient(rgb(240, 247, 255) 0%, rgb(230, 240, 255) 100%)',
                }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, #1A7FE9 0%, #1565C0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        Tools
                    </Typography>
                </Box>
                <List sx={{ pt: 1.5 }}>
                    {menuItems.map((item, index) => (
                        item.type === 'divider' ? (
                            <Divider key={`divider-${index}`} sx={{ my: 1, mx: 1, borderColor: 'rgba(0, 0, 0, 0.08)' }} />
                        ) : (
                            <ListItem
                                button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'chat') {
                                        setCurrentPage('chat');
                                        window.dispatchEvent(new CustomEvent('newChat'));
                                    } else {
                                        setCurrentPage(item.id as any);
                                    }
                                }}
                                selected={currentPage === item.id}
                                sx={{
                                    mb: 0.5,
                                    mx: 0.5,
                                    borderRadius: '8px',
                                    minHeight: 44,
                                    py: 0.6,
                                    px: 1.2,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    '&.Mui-selected': {
                                        background: 'linear-gradient(135deg, rgba(26, 127, 233, 0.08) 0%, rgba(26, 127, 233, 0.12) 100%)',
                                        boxShadow: '0 2px 8px rgba(26, 127, 233, 0.08)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, rgba(26, 127, 233, 0.12) 0%, rgba(26, 127, 233, 0.16) 100%)',
                                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.12)'
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: '#1A7FE9',
                                            background: 'linear-gradient(135deg, rgba(26, 127, 233, 0.08) 0%, rgba(26, 127, 233, 0.12) 100%)',
                                            transform: 'scale(1.05)',
                                            boxShadow: '0 2px 8px rgba(26, 127, 233, 0.12)'
                                        }
                                    },
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.04) 100%)',
                                        '& .tooltip': {
                                            visibility: 'visible',
                                            opacity: 1,
                                            transform: 'translateY(-50%)'
                                        }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{
                                    minWidth: 30,
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    color: '#666666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0, 0, 0, 0.04)',
                                    mr: 1.5,
                                    transition: 'all 0.3s ease',
                                    '& .MuiSvgIcon-root': {
                                        fontSize: 18
                                    }
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <Box
                                    className="tooltip"
                                    sx={{
                                        position: 'fixed',
                                        left: '56px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        color: '#fff',
                                        padding: '6px 12px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        visibility: 'hidden',
                                        opacity: 0,
                                        transition: 'all 0.2s ease',
                                        zIndex: 1400,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {item.text}
                                </Box>
                            </ListItem>
                        )
                    ))}
                </List>
            </Drawer>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    bgcolor: '#F8F9FA',
                    width: '100%',
                    transition: 'margin 0.3s ease-in-out',
                    p: 3,
                    padding: '0px 2px',
                    minWidth: `calc(100% - ${DRAWER_WIDTH}px)`,
                    overflowX: 'hidden',
                }}
            >
                <Box sx={{
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
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
                }}>
                    {currentPage === 'settings' ? (
                        <SettingsPanel />
                    ) : currentPage === 'history' ? (
                        <HistoryPanel />
                    ) : currentPage === 'debug' ? (
                        <SessionDebugPanel visible={true} />
                    ) : (
                        <ChatPanel />
                    )}
                </Box>
            </Box>
        </Box >
    );
};

export default HomePage;