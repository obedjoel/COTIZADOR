import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oneespaciocreativo.cotizador',
  appName: 'ONE Cotizador',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
