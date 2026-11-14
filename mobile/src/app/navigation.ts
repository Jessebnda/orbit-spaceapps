import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Hoy: NavigatorScreenParams<{ Hoy: undefined }> | undefined;
  Mascota: NavigatorScreenParams<{ Mascota: undefined; Chat: undefined }> | undefined;
  Protocolos: NavigatorScreenParams<{ Protocolos: undefined; ProtocolDetail: { id: string } }> | undefined;
  Juego: NavigatorScreenParams<{ Juego: undefined }> | undefined;
  Yo: NavigatorScreenParams<{ Yo: undefined; Ajustes: undefined; Logros: undefined }> | undefined;
};
export type RootParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CheckIn: undefined;
};
