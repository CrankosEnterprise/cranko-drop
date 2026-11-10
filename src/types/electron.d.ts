import { crankoApi } from '../../electron/preload/index';

declare global {
  interface Window {
    crankoApi: typeof crankoApi;
  }
}
