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

const DRAWER_WIDTH = 120;

const HomePage: React.FC = () => {
    const [currentPage, setCurrentPage] = React.useState<'chat' | 'settings' | 'history'>('history');

    const menuItems = [
        {
            group: 'Ai对话',
            items: [
                { id: 'history', icon: <HistoryIcon />, text: '历史对话' },
                { id: 'chat', icon: <ChatIcon />, text: '开始对话' }
            ]
        },
        {
            group: '网页工具',
            items: [
                { id: 'image', icon: <ImageIcon />, text: '图像助手' },
                { id: 'translate', icon: <TranslateIcon />, text: '智能翻译' }
            ]
        },
        {
            group: '开发工具',
            items: [
                { id: 'vms', icon: <TerminalIcon />, text: 'vm管理' }
            ]
        },
        {
            group: '设置管理',
            items: [
                { id: 'settings', icon: <SettingsIcon />, text: 'AI模型' }
            ]
        }
    ];

    return (
        <Box sx={{ height: '100%', display: 'flex' }}>
            <Drawer
                variant="permanent"
                anchor="left"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: '#FFFFFF',
                        borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.05)',
                        overflowX: 'hidden',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)'
                    }
                }}
            >
                <Box sx={{
                    p: 1.5,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            fontSize: '1rem',
                            background: 'linear-gradient(135deg, #1A7FE9 0%, #1565C0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        工具栏
                    </Typography>
                </Box>
                <List sx={{ pt: 1.5 }}>
                    {menuItems.map((group, groupIndex) => (
                        <React.Fragment key={group.group}>
                            {groupIndex > 0 && (
                                <Divider sx={{ my: 2.5 }} />
                            )}
                            <Typography
                                variant="caption"
                                sx={{
                                    px: 2,
                                    py: 0.5,
                                    color: '#666666',
                                    display: 'block',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                }}
                            >
                                {group.group}
                            </Typography>
                            {group.items.map((item) => (
                                <ListItem
                                    button
                                    key={item.id}
                                    onClick={() => setCurrentPage(item.id as any)}
                                    selected={currentPage === item.id}
                                    sx={{
                                        mb: 0.5,
                                        mx: 0.5,
                                        borderRadius: '6px',
                                        minHeight: 36,
                                        py: 0.8,
                                        px: 1.5,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease',
                                        '&.Mui-selected': {
                                            background: 'linear-gradient(135deg, rgba(26, 127, 233, 0.08) 0%, rgba(26, 127, 233, 0.12) 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, rgba(26, 127, 233, 0.12) 0%, rgba(26, 127, 233, 0.16) 100%)'
                                            },
                                            '& .MuiListItemIcon-root': {
                                                color: '#1A7FE9'
                                            },
                                            '& .MuiListItemText-primary': {
                                                color: '#1A7FE9',
                                                fontWeight: 600
                                            }
                                        },
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.04) 100%)'
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{
                                        minWidth: 16,
                                        width: 16,
                                        color: '#666666',
                                        justifyContent: 'center',
                                        '& .MuiSvgIcon-root': {
                                            fontSize: 18
                                        },
                                        mr: 1.5
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.text}
                                        sx={{
                                            m: 0,
                                            '& .MuiTypography-root': {
                                                textOverflow: 'ellipsis',
                                                overflow: 'hidden',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.8rem',
                                                fontWeight: 400,
                                                letterSpacing: '0.02em',
                                                color: '#333333',
                                                fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                            }
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </React.Fragment>
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
                    padding: '0px 12px',
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
                    ) : (
                        <ChatPanel />
                    )}
                </Box>
            </Box>
        </Box >
    );
};

export default HomePage;