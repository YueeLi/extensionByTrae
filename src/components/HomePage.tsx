import React from 'react';
import { Box } from '@mui/material';
import ChatPanel from './ChatPanel';
import SettingsPanel from './SettingsPanel';
import Header from './Header';
import Welcome from './Welcome';

// 侧边栏面板的主页组件
const HomePage: React.FC = () => {
    const [currentPage, setCurrentPage] = React.useState<'home' | 'chat' | 'settings'>('home');

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Header
                onHomeClick={() => setCurrentPage('home')}
                onSettingsClick={() => setCurrentPage('settings')}
                onChatClick={() => setCurrentPage('chat')}
            />
            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {currentPage === 'settings' ? (
                    <SettingsPanel />
                ) : currentPage === 'home' ? (
                    <Welcome onStart={() => setCurrentPage('chat')} />
                ) : (
                    <ChatPanel />
                )}
            </Box>
        </Box>
    );
};

export default HomePage;