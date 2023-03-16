/// <reference types="node" />
import Request from 'request';
import { ProxyServer } from './struct';
export type RequestOption = Request.CoreOptions & Request.RequiredUriUrl & {
    lookup?: (domain: any, options: any, callback: any) => void;
};
export declare class HiProxyConnector {
    masterIP: string;
    masterPort: number;
    socksPort: number;
    constructor(masterIP: string, masterPort?: number, socksPort?: number);
    getProxyServers(useCountLessThan: number, source?: string): Promise<ProxyServer[]>;
    occupyProxy(allowUsingCount: number, source?: string, usingSeconds?: number, retry?: number): Promise<null | ProxyServer>;
    releaseProxy(proxyId: string, refresh: boolean): Promise<void>;
    releaseAllProxies(refresh: boolean): Promise<void>;
    occupyAndRun<T>(allowUsingCount: number, source: string | undefined, usingSeconds: number | undefined, retry: number | undefined, release: boolean | undefined, task: (proxy: ProxyServer) => Promise<T>): Promise<T | Error>;
    wrapOptionWithProxyServer(option: RequestOption, proxyServer: ProxyServer, ipFamily: 4 | 6, account?: string, password?: string): RequestOption;
    socksRequestWithOptions(options: RequestOption[], allowUsingCount: number, source?: string, usingSeconds?: number, retry?: number, release?: boolean): Promise<{
        proxyServer: ProxyServer;
        results: (string | Buffer | Error)[];
    }>;
}
