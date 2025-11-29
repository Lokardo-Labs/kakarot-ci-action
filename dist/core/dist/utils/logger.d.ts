import type { KakarotConfig } from '../types/config.js';
export declare function initLogger(config: Pick<KakarotConfig, 'debug'>): void;
export declare function info(message: string, ...args: unknown[]): void;
export declare function debug(message: string, ...args: unknown[]): void;
export declare function warn(message: string, ...args: unknown[]): void;
export declare function error(message: string, ...args: unknown[]): void;
export declare function success(message: string, ...args: unknown[]): void;
export declare function progress(step: number, total: number, message: string, ...args: unknown[]): void;
//# sourceMappingURL=logger.d.ts.map