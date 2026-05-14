export type AppId =
  | 'qq'
  | 'chat'
  | 'characters'
  | 'settings'
  | 'customize'
  | 'worldbook'
  | 'schedule'
  | 'offline'
  | 'offline_mode'
  | 'user'
  | 'little_brain'
  | 'couple'
  | 'backend'
  | 'map6';

export type AppConfig = {
  id: AppId;
  name: string;
  title: string;
  legacySrc: string;
  hideTopbar?: boolean;
};

export type ShellAppHostSnapshot = {
  appId?: string;
  title?: string;
  hideTopbar?: boolean;
  open?: boolean;
};
