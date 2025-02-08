import { Settings } from '../types/types';

export class SettingsManager {
    static async getSettings(): Promise<Settings> {
        const result = await chrome.storage.sync.get(['models', 'defaultModelId']);
        console.log('models settings:', result);
        if (!result.models?.length) {
            throw new Error('请先在设置页面添加模型配置');
        }
        if (!result.defaultModelId) {
            throw new Error('请先在设置页面选择默认模型');
        }
        const defaultModel = result.models.find((m: { id: string }) => m.id === result.defaultModelId);
        if (!defaultModel) {
            throw new Error('未找到默认模型配置');
        }
        if (!defaultModel.apiKey) {
            throw new Error('默认模型的API密钥未配置');
        }
        if (!defaultModel.endpoint) {
            throw new Error('默认模型的API端点未配置');
        }
        return {
            models: result.models,
            defaultModelId: result.defaultModelId,
            defaultModel: defaultModel
        };
    }
}