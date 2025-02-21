import React from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    attachments?: Array<{
        type: 'image' | 'text' | 'pdf' | 'image_url' | 'file';
        content?: string;
        name?: string;
        url?: string;
        detail?: string;
    }>;
    textColor?: string;
    isReasoning?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, attachments = [], textColor = 'inherit', isReasoning = false }) => {
    return (
        <Box sx={{ 
            color: textColor,
            ...(isReasoning && {
                color: '#666666',
                fontSize: '0.9em',
                fontStyle: 'italic',
                borderLeft: '2px solid #E0E0E0',
                paddingLeft: '12px',
                margin: '8px 0'
            })
        }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, className, children, ...props }: { node?: any, className?: string, children?: React.ReactNode }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return match && !('inline' in props) ? (
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                    p: ({ children }) => <Typography variant="body1" sx={{ mb: 1, color: 'inherit' }}>{children}</Typography>,
                    h1: ({ children }) => <Typography variant="h4" sx={{ mb: 2, mt: 2, color: 'inherit' }}>{children}</Typography>,
                    h2: ({ children }) => <Typography variant="h5" sx={{ mb: 1.5, mt: 1.5, color: 'inherit' }}>{children}</Typography>,
                    h3: ({ children }) => <Typography variant="h6" sx={{ mb: 1, mt: 1, color: 'inherit' }}>{children}</Typography>,
                    ul: ({ children }) => <Box component="ul" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                    ol: ({ children }) => <Box component="ol" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                    li: ({ children }) => <Box component="li" sx={{ mb: 0.5 }}>{children}</Box>,
                    blockquote: ({ children }) => (
                        <Box
                            sx={{
                                borderLeft: '4px solid #1A7FE9',
                                pl: 2,
                                py: 1,
                                my: 1,
                                bgcolor: 'rgba(26, 127, 233, 0.04)'
                            }}
                        >
                            {children}
                        </Box>
                    )
                }}
            >
                {content}
            </ReactMarkdown>

            {attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    {attachments.map((attachment, index) => (
                        <Box key={index} sx={{ mt: 1 }}>
                            {(attachment.type === 'image' || attachment.type === 'image_url') && (
                                <img
                                    src={attachment.url || attachment.content}
                                    alt={attachment.detail || attachment.name || '图片'}
                                    style={{ maxWidth: '100%', maxHeight: '200px' }}
                                />
                            )}
                            {(attachment.type === 'text' || attachment.type === 'pdf' || attachment.type === 'file') && (
                                <Typography variant="caption" sx={{ color: textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}>
                                    {attachment.type === 'file' ? '文件：' : '附件：'}{attachment.detail || attachment.name}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default MarkdownRenderer;