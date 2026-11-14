import type { LinkingOptions } from '@react-navigation/native';
import type { RootParamList } from './navigation';

/** Stable links for returning to a feature from a reminder or another app. */
export const linking: LinkingOptions<RootParamList> = {
  prefixes: ['orbit://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Hoy: { screens: { Hoy: 'hoy' } },
          Mascota: { screens: { Mascota: 'mascota', Chat: 'chat' } },
          Protocolos: { screens: { Protocolos: 'protocolos', ProtocolDetail: 'protocolo/:id' } },
          Juego: { screens: { Juego: 'juego' } },
          Yo: { screens: { Yo: 'yo', Ajustes: 'ajustes', Logros: 'logros' } },
        },
      },
      CheckIn: 'check-in',
    },
  },
};
