import dns from 'dns';
import Request from 'request';
import request from 'request-promise';
import Bluebird from 'bluebird';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyServer, RespProxyServer, RespProxyServers } from './struct';

type RequestOption = Request.CoreOptions &
  Request.RequiredUriUrl & { lookup?: (domain: any, options: any, callback: any) => void };

export class HiProxyConnector {
  public masterIP: string;
  public masterPort: number;
  public socksPort: number;

  public constructor(masterIP: string, masterPort: number = 58070, socksPort: number = 58081) {
    if (masterIP === '') {
      throw new Error(`MasterIP not set`);
    }
    this.masterIP = masterIP;
    this.masterPort = masterPort;
    this.socksPort = socksPort;
  }

  public async getProxyServers(useCountLessThan: number): Promise<ProxyServer[]> {
    const json = await request(`http://${this.masterIP}:${this.masterPort}/listProxy`);
    const proxyServers: RespProxyServers = JSON.parse(json);
    return proxyServers.servers.filter(s => {
      return s.usingCount < useCountLessThan;
    });
  }

  public async occupyProxy(allowUsingCount: number, retry: number = 0): Promise<null | ProxyServer> {
    let proxyServer: RespProxyServer = { server: null };
    for (let r = 0; r < retry + 1 && proxyServer.server === null; r++) {
      const json = await request(`http://${this.masterIP}:${this.masterPort}/useProxy/${allowUsingCount}`);
      proxyServer = JSON.parse(json);
      if (proxyServer.server !== null) {
        return proxyServer.server;
      }
      await Bluebird.delay(1000);
    }
    return null;
  }

  public async releaseProxy(proxyId: string, refresh: boolean): Promise<void> {
    await request(`http://${this.masterIP}:${this.masterPort}/releaseProxy/${proxyId}/${refresh}`);
    return;
  }

  public async releaseAllProxies(refresh: boolean): Promise<void> {
    const servers = await this.getProxyServers(Number.MAX_VALUE);
    for (const server of servers) {
      for (let i = 0; i < server.usingCount; i++) {
        await this.releaseProxy(server.id, refresh);
        if (refresh === true) {
          break;
        }
      }
    }
  }

  public async occupyAndRun<T>(allowUsingCount: number, retry: number, release: boolean, task: (proxy: ProxyServer) => Promise<T>): Promise<T | Error> {
    try {
      const proxyServer = await this.occupyProxy(allowUsingCount, retry);
      if (proxyServer === null) {
        return new Error('NoEmptyProxy');
      }
      try {
        const result = await task(proxyServer);
        return result;
      } catch (e) {
        return e as Error;
      } finally {
        try {
          await this.releaseProxy(proxyServer.id, release);
        } catch { }
      }
    } catch (e) {
      return e as Error;
    }
  }

  public wrapOptionWithProxyServer(option: RequestOption, proxyServer: ProxyServer, ipFamily: 4 | 6): RequestOption {
    const proxy = `socks5://${proxyServer.ipv4}:${this.socksPort}`;
    option.agent = new SocksProxyAgent(proxy);
    option.family = ipFamily;
    if (option.lookup === undefined) {
      option.lookup = (domain: any, options: any, callback: any) => dns.lookup(domain, { family: ipFamily }, callback);
    }
    return option;
  }

  // multiple requests with one proxy
  public async socksRequestWithOptions(
    options: RequestOption[],
    refresh: boolean
  ): Promise<{ proxyServer: ProxyServer; results: (string | Buffer | Error)[] }> {
    // if refresh = true, need uniq proxy
    // if refresh = false, no care about uniq proxy
    const proxyServer = await this.occupyProxy(refresh ? 0 : Number.MAX_VALUE, 10);
    if (proxyServer === null) {
      throw new Error(`NoProxyFound`);
    }
    const promises: Promise<string | Buffer | Error>[] = [];
    for (let option of options) {
      option = this.wrapOptionWithProxyServer(option, proxyServer, option.family ?? 4);
      const promise = (async (o: RequestOption) => {
        try {
          if (o.encoding === null) {
            return (await request(o)) as Buffer;
          } else {
            return (await request(o)).toString();
          }
        } catch (e) {
          return e as Error;
        }
      })(option);
      promises.push(promise);
    }
    const results = await Promise.all(promises);
    await this.releaseProxy(proxyServer.id, refresh);
    return { proxyServer, results };
  }
}
