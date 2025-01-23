import React from 'react';
import { Box, IconButton, Tooltip, Divider } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AnalyticsIcon from '@mui/icons-material/Analytics';

interface ToolBarProps {
    onTranslate: () => void;
    onSummarize: () => void;
    onAnalyze: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({ onTranslate, onSummarize, onAnalyze }) => {
    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            padding: 1,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider'
        }}>
            <Tooltip title="翻译选中文本">
                <IconButton onClick={onTranslate} size="small">
                    <TranslateIcon />
                </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="总结页面内容">
                <IconButton onClick={onSummarize} size="small">
                    <SummarizeIcon />
                </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="分析页面数据">
                <IconButton onClick={onAnalyze} size="small">
                    <AnalyticsIcon />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

export default ToolBar;