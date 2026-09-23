const net = require('net');
const http = require('http');
const https = require('https');

class ProxyChecker {
  static parseProxy(proxyStr, proxyType = '') {
    if (!proxyStr || proxyStr.trim().toLowerCase() === 'no proxy') {
      return { isDirect: true };
    }
    let str = proxyStr.trim();
    let type = (proxyType && proxyType.toLowerCase().includes('socks')) ? 'socks5' : 'http';

    if (str.toLowerCase().startsWith('socks5://')) {
      type = 'socks5';
      str = str.substring(9);
    } else if (str.toLowerCase().startsWith('socks4://')) {
      type = 'socks5';
      str = str.substring(9);
    } else if (str.toLowerCase().startsWith('http://')) {
      type = 'http';
      str = str.substring(7);
    } else if (str.toLowerCase().startsWith('https://')) {
      type = 'https';
      str = str.substring(8);
    }

    let host = '', port = 80, user = '', pass = '';
    if (str.includes('@')) {
      const [auth, addr] = str.split('@');
      if (auth.includes(':')) {
        [user, pass] = auth.split(':');
      } else {
        user = auth;
      }
      const [h, p] = addr.split(':');
      host = h;
      port = parseInt(p, 10);
    } else {
      const parts = str.split(':');
      if (parts.length === 4) {
        host = parts[0];
        port = parseInt(parts[1], 10);
        user = parts[2];
        pass = parts[3];
      } else if (parts.length === 2) {
        host = parts[0];
        port = parseInt(parts[1], 10);
      } else {
        host = parts[0];
        port = parseInt(parts[1] || 80, 10);
      }
    }

    return { isDirect: false, type, host: (host || '').trim(), port: isNaN(port) ? 80 : port, user: (user || '').trim(), pass: (pass || '').trim() };
  }

  static checkTcpSocket(host, port, timeoutMs = 2500) {
    return new Promise((resolve) => {
      if (!host || !port || port <= 0 || port > 65535) {
        return resolve(false);
      }

      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        const octets = host.split('.').map(Number);
        if (octets.some(o => o < 0 || o > 255)) {
          return resolve(false);
        }
      }

      const socket = new net.Socket();
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);
      socket.on('connect', () => finish(true));
      socket.on('timeout', () => finish(false));
      socket.on('error', () => finish(false));

      try {
        socket.connect(port, host);
      } catch (e) {
        finish(false);
      }
    });
  }

  static queryHostGeo(host, timeoutMs = 2500) {
    return new Promise((resolve) => {
      // Ưu tiên truy vấn ipinfo.io
      const req = https.get(`https://ipinfo.io/${host}/json`, { headers: { 'User-Agent': 'curl/8.0.0' }, timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j && j.ip) {
              return resolve({ ip: j.ip || host, country: (j.country || 'us').toLowerCase() });
            }
          } catch (e) {}
          // Fallback sang ip-api
          ProxyChecker.fallbackIpApi(host, timeoutMs).then(resolve);
        });
      });
      req.on('error', () => ProxyChecker.fallbackIpApi(host, timeoutMs).then(resolve));
      req.on('timeout', () => { req.destroy(); ProxyChecker.fallbackIpApi(host, timeoutMs).then(resolve); });
    });
  }

  static fallbackIpApi(host, timeoutMs = 2000) {
    return new Promise((resolve) => {
      const req = http.get(`http://ip-api.com/json/${host}?fields=status,country,countryCode,query`, { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j && j.status === 'success') {
              return resolve({ ip: j.query || host, country: (j.countryCode || 'us').toLowerCase() });
            }
          } catch (e) {}
          resolve({ ip: host, country: 'us' });
        });
      });
      req.on('error', () => resolve({ ip: host, country: 'us' }));
      req.on('timeout', () => { req.destroy(); resolve({ ip: host, country: 'us' }); });
    });
  }

  static checkDirect(timeoutMs = 2500) {
    return new Promise((resolve) => {
      // Ưu tiên truy vấn trực tiếp https://ipinfo.io/json
      const req = https.get('https://ipinfo.io/json', { headers: { 'User-Agent': 'curl/8.0.0' }, timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j && j.ip) {
              return resolve({
                live: true,
                status: 'Live',
                ip: j.ip,
                country: (j.country || 'vn').toLowerCase()
              });
            }
          } catch (e) {}
          ProxyChecker.fallbackCheckDirect(timeoutMs).then(resolve);
        });
      });
      req.on('error', () => ProxyChecker.fallbackCheckDirect(timeoutMs).then(resolve));
      req.on('timeout', () => { req.destroy(); ProxyChecker.fallbackCheckDirect(timeoutMs).then(resolve); });
    });
  }

  static fallbackCheckDirect(timeoutMs = 2000) {
    return new Promise((resolve) => {
      const req = https.get('https://myip.link/cdn-cgi/trace', { timeout: timeoutMs }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const ipMatch = data.match(/ip=([^\r\n]+)/);
          const locMatch = data.match(/loc=([^\r\n]+)/);
          if (ipMatch) {
            return resolve({
              live: true,
              status: 'Live',
              ip: ipMatch[1].trim(),
              country: (locMatch ? locMatch[1].trim() : 'vn').toLowerCase()
            });
          }
          resolve({ live: true, status: 'Live', ip: '127.0.0.1', country: 'vn' });
        });
      });
      req.on('error', () => {
        http.get('http://ip-api.com/json', { timeout: 2000 }, (res2) => {
          let d2 = '';
          res2.on('data', c => d2 += c);
          res2.on('end', () => {
            try {
              const j = JSON.parse(d2);
              if (j && j.status === 'success') {
                return resolve({ live: true, status: 'Live', ip: j.query, country: (j.countryCode || 'vn').toLowerCase() });
              }
            } catch (e) {}
            resolve({ live: true, status: 'Live', ip: '127.0.0.1', country: 'vn' });
          });
        }).on('error', () => {
          resolve({ live: true, status: 'Live', ip: '127.0.0.1', country: 'vn' });
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ live: true, status: 'Live', ip: '127.0.0.1', country: 'vn' });
      });
    });
  }

  static testHttpProxy(host, port, user, pass, timeoutMs = 3500) {
    return new Promise((resolve) => {
      const headers = {
        'Host': 'ipinfo.io',
        'Proxy-Connection': 'close',
        'User-Agent': 'curl/8.0.0'
      };
      if (user && pass) {
        headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
      }

      const req = http.request({
        host,
        port,
        method: 'GET',
        path: 'http://ipinfo.io/json',
        headers,
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const j = JSON.parse(data);
              if (j && j.ip) {
                return resolve({
                  live: true,
                  status: 'Live',
                  ip: j.ip || host,
                  country: (j.country || 'us').toLowerCase(),
                  city: j.city || '',
                  org: j.org || ''
                });
              }
            } catch (e) {}
            return resolve({ live: true, status: 'Live', ip: host, country: 'us' });
          } else if (res.statusCode === 407) {
            return resolve({
              live: false,
              status: 'No connection',
              ip: host,
              country: 'vn',
              error: 'Proxy Authentication Required (407)'
            });
          } else {
            return resolve({
              live: false,
              status: 'No connection',
              ip: host,
              country: 'vn',
              error: `HTTP Error: ${res.statusCode}`
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          live: false,
          status: 'No connection',
          ip: host,
          country: 'vn',
          error: 'Connection timeout'
        });
      });

      req.on('error', (err) => {
        resolve({
          live: false,
          status: 'No connection',
          ip: host,
          country: 'vn',
          error: err.message || 'Connection failed'
        });
      });

      req.end();
    });
  }

  static testSocks5Proxy(host, port, user, pass, timeoutMs = 3500) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const finish = (result) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);
      socket.on('timeout', () => finish({ live: false, status: 'No connection', ip: host, country: 'vn', error: 'Connection timeout' }));
      socket.on('error', (err) => finish({ live: false, status: 'No connection', ip: host, country: 'vn', error: err.message || 'Connection failed' }));

      socket.connect(port, host, () => {
        if (user && pass) {
          socket.write(Buffer.from([0x05, 0x01, 0x02])); // 1 method: user/pass
        } else {
          socket.write(Buffer.from([0x05, 0x01, 0x00])); // 1 method: no auth
        }
      });

      let stage = 0;
      socket.on('data', async (chunk) => {
        if (stage === 0) {
          if (chunk[0] !== 0x05) {
            return finish({ live: false, status: 'No connection', ip: host, country: 'vn', error: 'Not a SOCKS5 proxy' });
          }
          const method = chunk[1];
          if (method === 0x00) {
            // No auth required, SOCKS5 is live!
            const geo = await ProxyChecker.queryHostGeo(host);
            return finish({ live: true, status: 'Live', ip: geo.ip || host, country: geo.country || 'us' });
          } else if (method === 0x02 && user && pass) {
            stage = 1;
            const uBuf = Buffer.from(user);
            const pBuf = Buffer.from(pass);
            const authBuf = Buffer.concat([
              Buffer.from([0x01, uBuf.length]),
              uBuf,
              Buffer.from([pBuf.length]),
              pBuf
            ]);
            socket.write(authBuf);
          } else {
            return finish({ live: false, status: 'No connection', ip: host, country: 'vn', error: 'SOCKS5 authentication required' });
          }
        } else if (stage === 1) {
          if (chunk[0] === 0x01 && chunk[1] === 0x00) {
            const geo = await ProxyChecker.queryHostGeo(host);
            return finish({ live: true, status: 'Live', ip: geo.ip || host, country: geo.country || 'us' });
          } else {
            return finish({ live: false, status: 'No connection', ip: host, country: 'vn', error: 'SOCKS5 invalid credentials' });
          }
        }
      });
    });
  }

  static testHttpsTunnel(host, port, user, pass, timeoutMs = 4000) {
    const tls = require('tls');
    return new Promise((resolve) => {
      const headers = {
        'Host': 'api.ipify.org:443',
        'Proxy-Connection': 'keep-alive',
        'User-Agent': 'SVBrowser/1.0'
      };
      if (user && pass) {
        headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
      }

      const req = http.request({
        host,
        port,
        method: 'CONNECT',
        path: 'api.ipify.org:443',
        headers,
        timeout: timeoutMs
      });

      let finished = false;
      const finish = (res) => {
        if (!finished) {
          finished = true;
          try { req.destroy(); } catch (e) {}
          resolve(res);
        }
      };

      req.on('connect', (res, socket) => {
        if (res.statusCode === 407) {
          try { socket.destroy(); } catch (e) {}
          return finish({
            live: false,
            status: 'No connection',
            ip: host,
            country: 'vn',
            error: 'Proxy Authentication Required (407)'
          });
        }
        if (res.statusCode !== 200) {
          try { socket.destroy(); } catch (e) {}
          return finish({
            live: false,
            status: 'No connection',
            ip: host,
            country: 'vn',
            error: `Proxy CONNECT status: ${res.statusCode}`
          });
        }

        const tlsSocket = tls.connect({
          socket,
          servername: 'api.ipify.org',
          timeout: timeoutMs
        }, () => {
          tlsSocket.write('GET /?format=json HTTP/1.1\r\nHost: api.ipify.org\r\nConnection: close\r\n\r\n');
        });

        let body = '';
        tlsSocket.on('data', (d) => body += d.toString());
        tlsSocket.on('end', async () => {
          try {
            const jsonMatch = body.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const j = JSON.parse(jsonMatch[0]);
              if (j && j.ip) {
                const geo = await ProxyChecker.queryHostGeo(j.ip);
                return finish({
                  live: true,
                  status: 'Live',
                  ip: j.ip,
                  country: geo.country || 'us'
                });
              }
            }
          } catch (e) {}
          finish({
            live: false,
            status: 'No connection',
            ip: host,
            country: 'vn',
            error: 'Tunnel established but invalid response'
          });
        });
        tlsSocket.on('error', (err) => finish({
          live: false,
          status: 'No connection',
          ip: host,
          country: 'vn',
          error: `TLS Error: ${err.message}`
        }));
        tlsSocket.on('timeout', () => {
          try { tlsSocket.destroy(); } catch (e) {}
          finish({
            live: false,
            status: 'No connection',
            ip: host,
            country: 'vn',
            error: 'TLS Timeout'
          });
        });
      });

      req.on('error', (err) => finish({
        live: false,
        status: 'No connection',
        ip: host,
        country: 'vn',
        error: err.message || 'CONNECT failed'
      }));

      req.on('timeout', () => finish({
        live: false,
        status: 'No connection',
        ip: host,
        country: 'vn',
        error: 'Proxy CONNECT timeout'
      }));

      req.end();
    });
  }

  static async testProxy(proxyStr, proxyType = '') {
    const parsed = this.parseProxy(proxyStr, proxyType);
    if (parsed.isDirect) {
      return this.checkDirect();
    }

    const { type, host, port, user, pass } = parsed;

    // SOCKS5
    if (type === 'socks5') {
      return this.testSocks5Proxy(host, port, user, pass, 3500);
    }

    // HTTP / HTTPS
    // 1. Thử qua HTTP GET trước
    const res = await this.testHttpProxy(host, port, user, pass, 3500);
    if (res.live) {
      return res;
    }

    // 2. Nếu HTTP GET thất bại (nhiều proxy chỉ cho phép HTTPS CONNECT), thử qua HTTPS Tunnel thật
    const tunnelRes = await this.testHttpsTunnel(host, port, user, pass, 4000);
    if (tunnelRes.live) {
      return tunnelRes;
    }

    // Trả về lỗi chi tiết, tuyệt đối không fallback TCP ảo gây hiểu lầm Live
    return (res.error && res.error.includes('407')) ? res : tunnelRes;
  }

  static getLangFromCountry(countryCode) {
    if (!countryCode) return 'vi';
    const cc = countryCode.toLowerCase().trim();
    const map = {
      vn: 'vi',
      us: 'en',
      gb: 'en',
      ca: 'en',
      au: 'en',
      nz: 'en',
      ru: 'ru',
      ua: 'uk',
      by: 'be',
      kz: 'kk',
      jp: 'ja',
      kr: 'ko',
      cn: 'zh-CN',
      tw: 'zh-TW',
      hk: 'zh-HK',
      th: 'th',
      id: 'id',
      ph: 'fil',
      my: 'ms',
      sg: 'en',
      in: 'hi',
      de: 'de',
      fr: 'fr',
      es: 'es',
      mx: 'es',
      ar: 'es',
      co: 'es',
      pt: 'pt',
      br: 'pt-BR',
      it: 'it',
      nl: 'nl',
      pl: 'pl',
      tr: 'tr',
      sa: 'ar',
      ae: 'ar',
      eg: 'ar'
    };
    return map[cc] || 'en';
  }
}

module.exports = ProxyChecker;
