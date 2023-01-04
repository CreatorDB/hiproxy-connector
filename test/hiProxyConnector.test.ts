import request from 'request-promise';
import { HiProxyConnector } from '../src/hiProxyConnector';

// export MASTER_IP=xxx.xxx.xxx.xxx
const masterIP = process.env.MASTER_IP || '';

async function testHiProxyConnector() {
  const connector = new HiProxyConnector(masterIP);
  const servers = await connector.getProxyServers(1);
  console.log(servers);
  if (servers.length === 0) {
    throw new Error('testHiProxyConnector no proxy servers');
  }
  const server = await connector.occupyProxy(0, 10);
  console.log(server);
  if (server !== null) {
    await connector.releaseProxy(server.id, true);
  }
  await connector.releaseAllProxies(false);
}

async function testRequest() {
  const connector = new HiProxyConnector(masterIP);
  const servers = await connector.getProxyServers(1);

  const option1: any = { url: 'http://ifconfig.co', headers: { 'user-agent': 'curl/7.79.1' } };
  connector.wrapOptionWithProxyServer(option1, servers[0], 4);
  const result1 = await request(option1);
  console.log(result1);

  const option2: any = { url: 'https://ifconfig.co', headers: { 'user-agent': 'curl/7.79.1' } };
  connector.wrapOptionWithProxyServer(option2, servers[0], 6);
  const result2 = await request(option2);
  console.log(result2);
}

async function testSocksRequestWithOptions() {
  const connector = new HiProxyConnector(masterIP);
  const { results } = await connector.socksRequestWithOptions(
    [
      { url: 'https://ifconfig.co', headers: { 'user-agent': 'curl/7.79.1' } },
      { url: 'https://ifconfig.co', headers: { 'user-agent': 'curl/7.79.1' } },
    ],
    true
  );
  console.log(results);
}
// testHiProxyConnector();
// testRequest();
// testSocksRequestWithOptions();
