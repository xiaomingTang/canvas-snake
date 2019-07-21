declare module "vconsole" {
    import * as CustomModule from "vconsole"

    export default class VConsole {
      version: string;
      isInited: boolean;
      activeTab: number;
      option: {
        [key: string]: string[]
      };
      constructor(opt?: any);
      show(): void;
      hide(): void;
      showSwitch(): void;
      hideSwitch(): void;
      showTab(tabId: number): void;
      destroy(): void;
    }
}
