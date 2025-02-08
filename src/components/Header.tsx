import React from 'react';
import { Box, IconButton, Button, Typography, Select, MenuItem, Chip, FormControl, InputLabel } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { ModelConfig } from '../types/model';

interface HeaderProps {
    onSettingsClick: () => void;
    onChatClick: () => void;
    onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    onSettingsClick,
    onChatClick,
    onHomeClick
}) => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            bgcolor: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <IconButton
                    onClick={onHomeClick}
                    sx={{
                        padding: '10px 14px',
                        borderRadius: '12px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            bgcolor: 'rgba(26, 127, 233, 0.08)',
                            transform: 'translateY(-1px)'
                        }
                    }}
                    aria-label="返回主页"
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <SmartToyIcon sx={{
                            color: '#1A7FE9',
                            fontSize: 28,
                            filter: 'drop-shadow(0 2px 4px rgba(26, 127, 233, 0.2))'
                        }} />
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                background: 'linear-gradient(135deg, #1A7FE9 0%, #1565C0 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                transition: 'all 0.3s ease',
                                textShadow: '0 2px 4px rgba(26, 127, 233, 0.1)'
                            }}
                        >
                            AiBot
                        </Typography>
                    </Box>
                </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={onSettingsClick}
                    sx={{
                        color: '#666666',
                        borderColor: 'rgba(0, 0, 0, 0.12)',
                        padding: '8px 20px',
                        borderRadius: '10px',
                        fontWeight: 500,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            borderColor: '#1A7FE9',
                            color: '#1A7FE9',
                            bgcolor: 'rgba(26, 127, 233, 0.04)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.08)'
                        }
                    }}
                >
                    设置
                </Button>
                <Button
                    variant="contained"
                    startIcon={<ChatIcon />}
                    onClick={onChatClick}
                    sx={{
                        bgcolor: '#1A7FE9',
                        color: '#FFFFFF',
                        padding: '8px 24px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(26, 127, 233, 0.15)',
                        '&:hover': {
                            bgcolor: '#1565C0',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 16px rgba(26, 127, 233, 0.2)'
                        }
                    }}
                >
                    对话
                </Button>
            </Box>
        </Box>
    );
};

export default Header;