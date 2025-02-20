import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

interface WelcomePageProps {
    onStart: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onStart }) => {
    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 3,
                textAlign: 'center',
                bgcolor: '#FFFFFF'
            }}
        >
            <Box sx={{ maxWidth: '800px', width: '100%', mt: 4 }}>
                <Box sx={{ mb: 6, textAlign: 'center' }}>
                    <img
                        src="/icons/home.png"
                        alt="AiBot Logo"
                        style={{
                            width: '240px',
                            height: 'auto',
                            marginBottom: '24px'
                        }}
                    />
                    <Typography variant="h4" sx={{ mb: 2, color: '#1A1A1A', fontWeight: 600 }}>
                        欢迎使用 AiBot
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#666666', maxWidth: '600px', margin: '0 auto' }}>
                        您的智能助手，让工作和学习更轻松高效
                    </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, mb: 6 }}>
                    {[
                        {
                            title: '智能翻译',
                            description: '支持多语言实时翻译，准确理解上下文，让您轻松突破语言障碍。'
                        },
                        {
                            title: '内容总结',
                            description: '快速提取网页关键信息，生成清晰的，帮助您高效获取重要信息。'
                        },
                        {
                            title: '文档分析',
                            description: '深入分析文档内容，提供专业见解，助您快速掌握文档要点。'
                        },
                        {
                            title: '智能对话',
                            description: '基于先进的AI技术，提供自然流畅的对话体验，解答您的各类问题。'
                        }
                    ].map((item, index) => (
                        <Box
                            key={index}
                            sx={{
                                textAlign: 'left',
                                p: 3,
                                bgcolor: '#F8F9FA',
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                transform: 'translateY(0)',
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: '#F0F7FF',
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 6px 20px rgba(26, 127, 233, 0.1)',
                                    '& .title': {
                                        color: '#1A7FE9'
                                    }
                                },
                                animation: 'fadeInUp 0.6s ease-out',
                                animationFillMode: 'both',
                                animationDelay: `${index * 0.1}s`
                            }}
                        >
                            <Typography
                                className="title"
                                variant="h6"
                                sx={{
                                    mb: 2,
                                    color: '#1A1A1A',
                                    fontWeight: 600,
                                    transition: 'color 0.3s ease'
                                }}
                            >
                                {item.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666666' }}>
                                {item.description}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<ChatIcon />}
                        onClick={onStart}
                        sx={{
                            bgcolor: '#1A7FE9',
                            color: '#FFFFFF',
                            padding: '12px 32px',
                            borderRadius: '8px',
                            transition: 'all 0.3s ease',
                            transform: 'translateY(0)',
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
        </Box>
    );
};

export default WelcomePage;