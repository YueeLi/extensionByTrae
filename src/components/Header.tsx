import React from 'react';
import { Box, IconButton, Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';

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
                    padding: 0,
                    '&:hover': {
                        bgcolor: 'transparent'
                    }
                }}
            >
                <img
                    src="/icons/icon48.png"
                    alt="AiBot Logo"
                    style={{
                        width: '32px',
                        height: '32px'
                    }}
                />
            </IconButton>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={onSettingsClick}
                    sx={{
                        bgcolor: '#1A7FE9',
                        color: '#FFFFFF',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: '#1565C0',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.2)'
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
                        padding: '6px 16px',
                        borderRadius: '8px',
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