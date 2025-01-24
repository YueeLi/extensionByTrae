import React from 'react';
import { Box, IconButton, Button, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface HeaderProps {
    onSettingsClick: () => void;
    onChatClick: () => void;
    onHomeClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onChatClick, onHomeClick }) => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid #E5E5E5',
            bgcolor: '#FFFFFF'
        }}>
            <IconButton
                onClick={onHomeClick}
                sx={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    '&:hover': {
                        bgcolor: 'rgba(26, 127, 233, 0.04)'
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon sx={{ color: '#1A7FE9', fontSize: 24 }} />
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            color: '#1A7FE9',
                            background: 'linear-gradient(135deg, #1A7FE9 0%, #1565C0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        AiBot
                    </Typography>
                </Box>
            </IconButton>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={onSettingsClick}
                    sx={{
                        color: '#666666',
                        borderColor: '#E5E5E5',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderColor: '#1A7FE9',
                            color: '#1A7FE9',
                            bgcolor: 'rgba(26, 127, 233, 0.04)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.1)'
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
                        padding: '6px 20px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: '#1565C0',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.2)'
                        }
                    }}
                >
                    开始对话
                </Button>
            </Box>
        </Box>
    );
};

export default Header;