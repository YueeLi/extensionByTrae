/** @jsxImportSource react */
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
    ThemeProvider,
    createTheme,
    Box,
    IconButton,
    Divider,
    Snackbar,
    Alert,
    Typography,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MarkdownRenderer from '@/components/commen/MarkdownRenderer';
import TranslateIcon from '@mui/icons-material/Translate';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ExplainIcon from '@mui/icons-material/Help';
import { MessageContent } from '../types/types';

// 在文件开头添加调试日志
console.log('Content script loaded');

// 主题配置
const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2'
        },
        background: {
            default: '#f5f5f5'
        }
    }
});

// 悬浮工具栏组件属性定义
interface FloatingToolbarProps {
    position: { x: number; y: number };
    onClose: () => void;
}

// 结果展示面板接口定义
interface ResultPanelProps {
    result: {
        type: string;
        content: string;
        text: string;
    } | null;
    position: { x: number; y: number };
    onClose: () => void;
}

// 结果展示面板组件
const ResultPanel: React.FC<ResultPanelProps> = ({ result, position, onClose }) => {
    if (!result) return null;

    // 计算视口高度和结果面板的位置
    const viewportHeight = window.innerHeight;
    const panelHeight = 300; // 预估结果面板高度
    const spaceBelow = viewportHeight - position.y - 45;
    const showBelow = spaceBelow >= panelHeight;

    return (
        <Box
            sx={{
                position: 'fixed',
                left: position.x,
                top: showBelow ? position.y + 45 : position.y - panelHeight - 45,
                maxWidth: '600px',
                width: 'auto',
                minWidth: '320px',
                maxHeight: '80vh',
                bgcolor: 'rgba(255, 255, 255, 0.98)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                p: 3,
                zIndex: 2147483646,
                animation: showBelow ? 'slideInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(26, 127, 233, 0.1)',
                backdropFilter: 'blur(12px)',
                transform: 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowY: 'auto',
                '&:hover': {
                    boxShadow: '0 12px 48px rgba(26, 127, 233, 0.16)',
                    transform: 'scale(1.02)'
                },
                '&::-webkit-scrollbar': {
                    width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                    background: '#F5F5F5',
                    borderRadius: '3px'
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#E0E0E0',
                    borderRadius: '3px',
                    '&:hover': {
                        background: '#BDBDBD'
                    }
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.01em' }}>
                    {result.type === 'translate' ? '翻译结果' :
                        result.type === 'summarize' ? '内容总结' :
                            result.type === 'analyze' ? '分析结果' : '解释说明'}
                </Typography>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: '#666666',
                        '&:hover': {
                            color: '#1A7FE9',
                            bgcolor: 'rgba(26, 127, 233, 0.04)'
                        }
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor" />
                    </svg>
                </IconButton>
            </Box>
            <Box sx={{ color: '#666666', fontSize: '14px', mb: 2, maxHeight: '30vh', overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: 'rgba(0, 0, 0, 0.1)', borderRadius: '4px', '&:hover': { background: 'rgba(0, 0, 0, 0.2)' } } }}>
                <Typography variant="body2" sx={{ mb: 1 }}>原文：</Typography>
                <MarkdownRenderer content={result.text} />
            </Box>
            <Box sx={{ maxHeight: '40vh', overflowY: 'auto', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-track': { background: 'transparent' }, '&::-webkit-scrollbar-thumb': { background: 'rgba(0, 0, 0, 0.1)', borderRadius: '4px', '&:hover': { background: 'rgba(0, 0, 0, 0.2)' } } }}>
                <MarkdownRenderer content={result.content} />
            </Box>
        </Box>
    );
};

// 悬浮工具栏组件：提供文本翻译、总结和分析功能
const MAX_TEXT_LENGTH = 10000; // 设置最大文本长度限制

// 禁用时长固定为5分钟
const DISABLE_DURATION = 5 * 60 * 1000;

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ position, onClose }) => {
    const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
    const [error, setError] = React.useState<string>('');
    const [inputContent, setContent] = React.useState<MessageContent[]>([]);

    // 组件卸载时清理状态
    React.useEffect(() => {
        const cleanup = () => {
            setLoadingStates({});
            setError('');
            setContent([]);
        };
        return cleanup;
    }, []);

    // 检查选中文本长度
    const checkTextLength = (text: string): boolean => {
        if (text.length > MAX_TEXT_LENGTH) {
            setError('选中文本过长，请缩短选择范围');
            return false;
        }
        return true;
    };

    // 处理悬浮工具栏中的操作
    const handleAction = async (operate: string) => {
        const selectedText = window.getSelection()?.toString().trim() || '';

        if (!selectedText) {
            setError('请先选择要处理的文本');
            return;
        }

        if (!checkTextLength(selectedText)) {
            return;
        }

        setLoadingStates(prev => ({ ...prev, [operate]: true }));

        const newContent: MessageContent[] = [{
            type: 'text',
            text: selectedText
        }];

        setContent(newContent);

        try {
            if (!chrome.runtime) {
                throw new Error('扩展未准备就绪，请刷新页面重试');
            }

            // 渲染结果面板
            const resultPanelContainer = document.createElement('div');
            resultPanelContainer.id = 'result-panel-root';
            document.body.appendChild(resultPanelContainer);

            const resultPanelRoot = ReactDOM.createRoot(resultPanelContainer);
            let streamContent = '';

            // 初始渲染空内容的结果面板
            resultPanelRoot.render(
                <ResultPanel
                    position={position}
                    result={{
                        type: operate,
                        content: '',
                        text: selectedText
                    }}
                    onClose={() => {
                        resultPanelRoot.unmount();
                        document.body.removeChild(resultPanelContainer);
                    }}
                />
            );

            // 建立流式连接
            const port = chrome.runtime.connect({ name: 'STREAM_LLM' });

            // 监听流式响应
            port.onMessage.addListener((msg) => {
                if (msg.type === 'CHUNK') {
                    streamContent += msg.data;
                    // 使用requestAnimationFrame优化渲染性能
                    requestAnimationFrame(() => {
                        resultPanelRoot.render(
                            <ResultPanel
                                position={position}
                                result={{
                                    type: operate,
                                    content: streamContent,
                                    text: selectedText
                                }}
                                onClose={() => {
                                    port.disconnect();
                                    resultPanelRoot.unmount();
                                    document.body.removeChild(resultPanelContainer);
                                }}
                            />
                        );
                    });
                } else if (msg.type === 'ERROR') {
                    setError(`${operate}操作失败: ${msg.error}`);
                    port.disconnect();
                    resultPanelRoot.unmount();
                    document.body.removeChild(resultPanelContainer);
                } else if (msg.type === 'DONE') {
                    port.disconnect();
                }
            });

            // 发送开始指令
            port.postMessage({
                action: 'CONTENT',
                operate: operate,
                content: newContent
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            setError(`${operate}操作失败: ${errorMessage}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [operate]: false }));
        }
    };

    const renderActionButton = (operate: string, icon: React.ReactNode, label: string) => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
            }}
        >
            <IconButton
                onClick={() => handleAction(operate)}
                disabled={loadingStates[operate]}
                sx={{
                    width: 32,
                    height: 32,
                    padding: '4px',
                    minWidth: '32px',
                    position: 'relative'
                }}
            >
                {loadingStates[operate] ? (
                    <CircularProgress
                        size={20}
                        sx={{
                            color: '#1A7FE9',
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            marginTop: '-10px',
                            marginLeft: '-10px'
                        }}
                    />
                ) : icon}
            </IconButton>
            <Typography
                variant="caption"
                sx={{
                    fontSize: '10px',
                    color: loadingStates[operate] ? '#CCCCCC' : '#666666',
                    transition: 'all 0.3s ease',
                    opacity: loadingStates[operate] ? 0.6 : 1
                }}
            >
                {label}
            </Typography>
        </Box>
    );

    // 处理工具栏禁用
    const handleDisableToolbar = () => {
        const disableUntil = Date.now() + DISABLE_DURATION;
        localStorage.setItem('toolbarDisabledUntil', disableUntil.toString());
        onClose();
    };

    return (
        <ThemeProvider theme={theme}>
            <Snackbar
                open={!!error}
                autoHideDuration={3000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
            <Box
                sx={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y - 45,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    padding: '12px',
                    bgcolor: 'rgba(255, 255, 255, 0.92)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    zIndex: 2147483646,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(26, 127, 233, 0.1)',
                    transform: 'translateY(0)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: '0 12px 48px rgba(26, 127, 233, 0.16)',
                        transform: 'translateY(-4px)'
                    },
                    '& .MuiIconButton-root': {
                        width: 32,
                        height: 32,
                        borderRadius: '12px',
                        backgroundColor: '#F8F9FA',
                        color: '#1A1A1A',
                        padding: '8px',
                        minWidth: '32px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            backgroundColor: '#1A7FE9',
                            color: '#FFFFFF',
                            transform: 'translateY(-2px) scale(1.05)',
                            boxShadow: '0 4px 12px rgba(26, 127, 233, 0.2)'
                        },
                        '&:active': {
                            backgroundColor: '#1565C0',
                            transform: 'translateY(0) scale(0.95)'
                        },
                        '&.Mui-disabled': {
                            backgroundColor: '#F5F5F5',
                            color: '#CCCCCC',
                            transform: 'none',
                            boxShadow: 'none'
                        },
                        '& .MuiSvgIcon-root': {
                            fontSize: '20px',
                            transition: 'transform 0.3s ease'
                        }
                    }
                }}
            >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    {renderActionButton('translate', <TranslateIcon />, '翻译')}
                    {renderActionButton('summarize', <SummarizeIcon />, '总结')}
                    {renderActionButton('analyze', <AnalyticsIcon />, '分析')}
                    {renderActionButton('explain', <ExplainIcon />, '解释')}
                    <Divider orientation="vertical" sx={{
                        height: '40px',
                        margin: '0 8px',
                        borderColor: 'rgba(0, 0, 0, 0.08)'
                    }} />
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                        }}
                    >
                        <IconButton
                            onClick={handleDisableToolbar}
                            size="small"
                            sx={{
                                width: 32,
                                height: 32,
                                padding: '4px',
                                minWidth: '32px',
                                color: '#666666',
                                '&:hover': {
                                    color: '#1A7FE9',
                                    backgroundColor: 'rgba(26, 127, 233, 0.04)'
                                }
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Typography
                            variant="caption"
                            sx={{
                                fontSize: '10px',
                                color: '#666666'
                            }}
                        >
                            关闭
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

// 创建工具栏容器
const container = document.createElement('div');
container.id = 'floating-toolbar-root';
container.style.position = 'fixed';
container.style.zIndex = '2147483647';
document.body.appendChild(container);

let toolbarRoot: ReactDOM.Root | null = null;

// 防抖函数
const debounce = (fn: Function, delay: number) => {
    let timer: number | null = null;
    return (...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    };
};

// 最小选中文本长度
const MIN_TEXT_LENGTH = 2;

// 清理工具栏
const cleanupToolbar = () => {
    if (toolbarRoot) {
        toolbarRoot.unmount();
        toolbarRoot = null;
    }
};

// 渲染工具栏
const renderToolbar = (position: { x: number; y: number }) => {
    try {
        cleanupToolbar();
        // 计算视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 工具栏预估尺寸
        const toolbarWidth = 300;
        const toolbarHeight = 80;

        // 获取选中文本的位置信息
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        const textRect = range?.getBoundingClientRect();

        if (!textRect) return;

        // 计算四个方向的可用空间
        const spaceAbove = textRect.top;
        const spaceBelow = viewportHeight - textRect.bottom;
        const spaceLeft = textRect.left;
        const spaceRight = viewportWidth - textRect.right;

        // 确定最佳位置
        let adjustedPosition = { x: position.x, y: position.y };

        // 优先选择空间最大的方向
        if (spaceAbove >= toolbarHeight && spaceAbove >= Math.max(spaceBelow, spaceLeft, spaceRight)) {
            // 显示在上方
            adjustedPosition = {
                x: Math.min(Math.max(0, textRect.left), viewportWidth - toolbarWidth),
                y: textRect.top - toolbarHeight - 10
            };
        } else if (spaceBelow >= toolbarHeight && spaceBelow >= Math.max(spaceLeft, spaceRight)) {
            // 显示在下方
            adjustedPosition = {
                x: Math.min(Math.max(0, textRect.left), viewportWidth - toolbarWidth),
                y: textRect.bottom + 10
            };
        } else if (spaceLeft >= toolbarWidth) {
            // 显示在左侧
            adjustedPosition = {
                x: Math.max(0, textRect.left - toolbarWidth - 10),
                y: Math.min(Math.max(45, textRect.top), viewportHeight - toolbarHeight)
            };
        } else if (spaceRight >= toolbarWidth) {
            // 显示在右侧
            adjustedPosition = {
                x: textRect.right + 10,
                y: Math.min(Math.max(45, textRect.top), viewportHeight - toolbarHeight)
            };
        } else {
            // 默认显示在下方，但确保在视口内
            adjustedPosition = {
                x: Math.min(Math.max(0, textRect.left), viewportWidth - toolbarWidth),
                y: Math.min(textRect.bottom + 10, viewportHeight - toolbarHeight)
            };
        }

        toolbarRoot = ReactDOM.createRoot(container);
        toolbarRoot.render(
            <React.StrictMode>
                <FloatingToolbar
                    position={adjustedPosition}
                    onClose={cleanupToolbar}
                />
            </React.StrictMode>
        );
    } catch (error) {
        console.error('工具栏渲染失败', error);
        cleanupToolbar();
    }
};

// 检查工具栏是否被禁用
const isToolbarDisabled = () => {
    const disabledUntil = localStorage.getItem('toolbarDisabledUntil');
    if (disabledUntil) {
        const disabledTime = parseInt(disabledUntil);
        if (Date.now() < disabledTime) {
            return true;
        }
        localStorage.removeItem('toolbarDisabledUntil');
    }
    return false;
};

// 处理文本选择
const handleTextSelection = debounce(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    if (!selectedText || selectedText.length < MIN_TEXT_LENGTH || isToolbarDisabled()) {
        setTimeout(cleanupToolbar, 300);
        return;
    }

    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    if (!rect) return;

    const position = {
        x: Math.min(rect.left, window.innerWidth - 200),
        y: rect.top
    };

    renderToolbar(position);
}, 1500);

// 监听文本选择事件
document.addEventListener('mouseup', handleTextSelection);

// 点击页面其他地方时隐藏工具条
document.addEventListener('mousedown', (event) => {
    if (
        toolbarRoot &&
        event.target instanceof Node &&
        !container.contains(event.target)
    ) {
        toolbarRoot.unmount();
        toolbarRoot = null;
    }
});

// 页面卸载时清理
window.addEventListener('unload', () => {
    if (toolbarRoot) {
        toolbarRoot.unmount();
        toolbarRoot = null;
    }
    if (container && container.parentNode) {
        container.parentNode.removeChild(container);
    }
});