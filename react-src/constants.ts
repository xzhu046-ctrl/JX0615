import type { AppConfig } from './types';

export const INSTALLED_APPS: AppConfig[] = [
  { id: 'qq', name: 'QQ', title: 'QQ', legacySrc: 'apps/qq.html', hideTopbar: true },
  { id: 'chat', name: 'Chat', title: 'Chat', legacySrc: 'apps/chat.html', hideTopbar: true },
  { id: 'settings', name: '设置', title: '设置', legacySrc: 'apps/settings.html' },
  { id: 'customize', name: '外观', title: '外观', legacySrc: 'apps/customize.html' },
  { id: 'worldbook', name: '档案', title: '档案', legacySrc: 'apps/worldbook.html' },
  { id: 'schedule', name: '日程', title: '日程', legacySrc: 'apps/schedule.html', hideTopbar: true },
  { id: 'offline', name: '约会', title: '约会', legacySrc: 'apps/react/offline.html', hideTopbar: true },
  { id: 'offline_mode', name: '线下', title: '线下', legacySrc: 'apps/offline_mode.html', hideTopbar: true },
  { id: 'user', name: '小脑瓜', title: '小脑瓜', legacySrc: 'apps/little_brain.html', hideTopbar: true },
  { id: 'little_brain', name: '小脑瓜', title: '小脑瓜', legacySrc: 'apps/little_brain.html', hideTopbar: true },
  { id: 'couple', name: '情侣空间', title: '情侣空间', legacySrc: 'apps/qq_profile.html?couple=1', hideTopbar: true },
  { id: 'backend', name: '后台', title: '后台', legacySrc: 'apps/react/backend.html' },
  { id: 'map6', name: '地图', title: '地图', legacySrc: 'apps/map6.html' }
];

export const DOCK_APPS = ['qq', 'settings', 'customize', 'worldbook'] as const;
