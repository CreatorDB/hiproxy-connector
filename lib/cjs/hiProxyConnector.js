"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HiProxyConnector = void 0;
const dns_1 = __importDefault(require("dns"));
const request_promise_1 = __importDefault(require("request-promise"));
const bluebird_1 = __importDefault(require("bluebird"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
class HiProxyConnector {
    constructor(masterIP, masterPort = 58070, socksPort = 58081) {
        if (masterIP === '') {
            throw new Error(`MasterIP not set`);
        }
        this.masterIP = masterIP;
        this.masterPort = masterPort;
        this.socksPort = socksPort;
    }
    getProxyServers(useCountLessThan, source = 'hinet') {
        return __awaiter(this, void 0, void 0, function* () {
            const json = yield (0, request_promise_1.default)(`http://${this.masterIP}:${this.masterPort}/listProxy/${source}`);
            const proxyServers = JSON.parse(json);
            return proxyServers.servers.filter(s => {
                return s.usingCount < useCountLessThan;
            });
        });
    }
    occupyProxy(allowUsingCount, source = 'hinet', usingSeconds = 180000, retry = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let proxyServer = { server: null };
            for (let r = 0; r < retry + 1 && proxyServer.server === null; r++) {
                const json = yield (0, request_promise_1.default)(`http://${this.masterIP}:${this.masterPort}/useProxy/${allowUsingCount}/${source}/${usingSeconds}`);
                proxyServer = JSON.parse(json);
                if (proxyServer.server !== null) {
                    return proxyServer.server;
                }
                yield bluebird_1.default.delay(1000);
            }
            return null;
        });
    }
    releaseProxy(proxyId, refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, request_promise_1.default)(`http://${this.masterIP}:${this.masterPort}/releaseProxy/${proxyId}/${refresh}`);
            return;
        });
    }
    releaseAllProxies(refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            const servers = yield this.getProxyServers(Number.MAX_VALUE);
            for (const server of servers) {
                for (let i = 0; i < server.usingCount; i++) {
                    yield this.releaseProxy(server.id, refresh);
                    if (refresh === true) {
                        break;
                    }
                }
            }
        });
    }
    occupyAndRun(allowUsingCount, source = 'hinet', usingSeconds = 180000, retry = 10, release = true, task) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const proxyServer = yield this.occupyProxy(allowUsingCount, source, usingSeconds, retry);
                if (proxyServer === null) {
                    return new Error('NoEmptyProxy');
                }
                try {
                    const result = yield task(proxyServer);
                    return result;
                }
                catch (e) {
                    return e;
                }
                finally {
                    try {
                        yield this.releaseProxy(proxyServer.id, release);
                    }
                    catch (_a) { }
                }
            }
            catch (e) {
                return e;
            }
        });
    }
    wrapOptionWithProxyServer(option, proxyServer, ipFamily, account = '', password = '') {
        const proxy = account === ''
            ? `socks5://${proxyServer.ipv4}:${this.socksPort}`
            : `socks5://${account}:${password}@${proxyServer.ipv4}:${proxyServer.ipv4Port}`;
        option.agent = new socks_proxy_agent_1.SocksProxyAgent(proxy);
        option.family = ipFamily;
        if (option.lookup === undefined) {
            option.lookup = (domain, options, callback) => dns_1.default.lookup(domain, { family: ipFamily }, callback);
        }
        return option;
    }
    // multiple requests with one proxy
    socksRequestWithOptions(options, allowUsingCount, source = 'hinet', usingSeconds = 180000, retry = 10, release = true) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // if refresh = true, need uniq proxy
            // if refresh = false, no care about uniq proxy
            const proxyServer = yield this.occupyProxy(allowUsingCount, source, usingSeconds, retry);
            if (proxyServer === null) {
                throw new Error(`NoProxyFound`);
            }
            const promises = [];
            for (let option of options) {
                option = this.wrapOptionWithProxyServer(option, proxyServer, (_a = option.family) !== null && _a !== void 0 ? _a : 4);
                const promise = ((o) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (o.encoding === null) {
                            return (yield (0, request_promise_1.default)(o));
                        }
                        else {
                            return (yield (0, request_promise_1.default)(o)).toString();
                        }
                    }
                    catch (e) {
                        return e;
                    }
                }))(option);
                promises.push(promise);
            }
            const results = yield Promise.all(promises);
            yield this.releaseProxy(proxyServer.id, release);
            return { proxyServer, results };
        });
    }
}
exports.HiProxyConnector = HiProxyConnector;
