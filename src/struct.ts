export interface RespProxyServer {
  server: ProxyServer | null;
}

export interface RespProxyServers {
  servers: ProxyServer[];
}

export interface ProxyServer {
  id: string;
  ipv4: string;
  ipv6: string;
  ipv4Port: number;
  ipv6Port: number;
  usingCount: number;
}
