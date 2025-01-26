import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    TextField,
    Box,
    Typography,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface Template {
    id: string;
    title: string;
    content: string;
}

interface TemplateDialogProps {
    open: boolean;
    onClose: () => void;
    onSelectTemplate: (content: string) => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({ open, onClose, onSelectTemplate }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editTemplate, setEditTemplate] = useState<Template | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    useEffect(() => {
        // 从 Chrome 存储加载模板
        chrome.storage.sync.get(['promptTemplates'], (result) => {
            if (result.promptTemplates) {
                setTemplates(result.promptTemplates);
            }
        });
    }, []);

    const saveTemplates = (newTemplates: Template[]) => {
        chrome.storage.sync.set({ promptTemplates: newTemplates });
        setTemplates(newTemplates);
    };

    const handleAddTemplate = () => {
        if (!newTitle.trim() || !newContent.trim()) return;

        const newTemplate: Template = {
            id: Date.now().toString(),
            title: newTitle.trim(),
            content: newContent.trim()
        };

        saveTemplates([...templates, newTemplate]);
        setNewTitle('');
        setNewContent('');
        setIsEditing(false);
    };

    const handleEditTemplate = (template: Template) => {
        setEditTemplate(template);
        setNewTitle(template.title);
        setNewContent(template.content);
        setIsEditing(true);
    };

    const handleUpdateTemplate = () => {
        if (!editTemplate || !newTitle.trim() || !newContent.trim()) return;

        const updatedTemplates = templates.map(t =>
            t.id === editTemplate.id
                ? { ...t, title: newTitle.trim(), content: newContent.trim() }
                : t
        );

        saveTemplates(updatedTemplates);
        setEditTemplate(null);
        setNewTitle('');
        setNewContent('');
        setIsEditing(false);
    };

    const handleDeleteTemplate = (id: string) => {
        const updatedTemplates = templates.filter(t => t.id !== id);
        saveTemplates(updatedTemplates);
    };

    const handleSelect = (content: string) => {
        onSelectTemplate(content);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">提示词模板</Typography>
                    {!isEditing && (
                        <Button
                            startIcon={<AddIcon />}
                            onClick={() => setIsEditing(true)}
                            sx={{ color: '#1A7FE9' }}
                        >
                            新增模板
                        </Button>
                    )}
                </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                {isEditing ? (
                    <Box sx={{ p: 2 }}>
                        <TextField
                            fullWidth
                            label="模板标题"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            margin="normal"
                        />
                        <TextField
                            fullWidth
                            label="模板内容"
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            multiline
                            rows={4}
                            margin="normal"
                        />
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditTemplate(null);
                                    setNewTitle('');
                                    setNewContent('');
                                }}
                                color="inherit"
                            >
                                取消
                            </Button>
                            <Button
                                onClick={editTemplate ? handleUpdateTemplate : handleAddTemplate}
                                variant="contained"
                            >
                                {editTemplate ? '更新' : '保存'}
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {templates.map((template, index) => (
                            <React.Fragment key={template.id}>
                                {index > 0 && <Divider />}
                                <ListItem
                                    button
                                    onClick={() => handleSelect(template.content)}
                                    sx={{
                                        '&:hover': {
                                            bgcolor: 'rgba(26, 127, 233, 0.04)'
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={template.title}
                                        secondary={template.content}
                                        secondaryTypographyProps={{
                                            sx: {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }
                                        }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditTemplate(template);
                                            }}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTemplate(template.id);
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    关闭
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TemplateDialog;