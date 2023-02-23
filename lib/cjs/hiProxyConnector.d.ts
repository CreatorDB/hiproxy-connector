/// <reference types="node" />
import Request from 'request';
import { ProxyServer } from './struct';
type RequestOption = Request.CoreOptions & Request.RequiredUriUrl & {
    lookup?: (domain: any, options: any, callback: any) => void;
};
export declare class HiProxyConnector {
    masterIP: string;
    masterPort: number;
    socksPort: number;
    constructor(masterIP: string, masterPort?: number, socksPort?: number);
    getProxyServers(useCountLessThan: number): Promise<ProxyServer[]>;
    occupyProxy(allowUsingCount: number, retry?: number): Promise<null | ProxyServer>;
    releaseProxy(proxyId: string, refresh: boolean): Promise<void>;
    releaseAllProxies(refresh: boolean): Promise<void>;
    occupyAndRun<T>(allowUsingCount: number, retry: number, release: boolean, task: (proxy: ProxyServer) => Promise<T>): Promise<T | Error>;
    wrapOptionWithProxyServer(option: RequestOption, proxyServer: ProxyServer, ipFamily: 4 | 6): RequestOption;
    socksRequestWithOptions(options: RequestOption[], refresh: boolean): Promise<{
        proxyServer: ProxyServer;
        results: (string | Buffer | Error)[];
    }>;
}
export {};
