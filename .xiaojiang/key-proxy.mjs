#!/usr/bin/env node
// key-proxy：把 dsh 的 OpenAI 兼容请求转给真上游，顺手把假 key 换成真 key。
//
// 为什么需要它：dsh 作为普通子进程跑在 runner 上，agent 能执行任意命令，
// 所以任何出现在它环境变量里的密钥都等于公开。这个进程单独持有真 key，
// dsh 只知道 http://127.0.0.1:<port>/v1 和一个假 key。
//
// 真 key 从 stdin 读一次：printf '%s' "$KEY" | node key-proxy.mjs
// 读完立刻把缓冲区清零，不写日志、不落盘、不进环境变量。

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const PORT = Number(process.env.KEY_PROXY_PORT || 8787);
const UPSTREAM = process.env.KEY_PROXY_UPSTREAM || 'https://logic769.xyz';
const up = new URL(UPSTREAM);

let realKey = '';
let requests = 0;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve();
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      realKey = Buffer.concat(chunks).toString('utf8').trim();
      for (const c of chunks) c.fill(0);
      chunks.length = 0;
      resolve();
    });
    process.stdin.on('error', resolve);
    process.stdin.resume();
  });
}

function targetFor(rawUrl) {
  // dsh 固定把请求发到 baseURL 的 /v1/... 下，所以 rawUrl 总是以 /v1/ 开头。
  // 上游若已经以 /v1 结尾（默认的 https://logic769.xyz/v1 就是），别再拼一次，
  // 否则 https://other.com/api/v1 会被拼成 /api/v1/v1/messages。
  const base = up.origin + up.pathname.replace(/\/+$/, '');
  if (base.endsWith('/v1') && rawUrl.startsWith('/v1/')) return new URL(base + rawUrl.slice(3));
  // 上游带别的路径前缀（例如 /api）时，拼在前面。
  const prefix = up.pathname.replace(/\/+$/, '');
  const need = prefix && !rawUrl.startsWith(prefix + '/');
  return new URL(up.origin + (need ? prefix : '') + rawUrl);
}

function fail(res, status, message) {
  if (res.headersSent) { res.destroy(); return; }
  const body = JSON.stringify({ error: { message, type: 'key_proxy_error' } });
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    const body = JSON.stringify({ ok: true, requests, upstream: up.origin + up.pathname });
    res.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    res.end(body);
    return;
  }

  if (!realKey) { fail(res, 503, 'key-proxy has no key'); return; }

  requests += 1;
  const n = requests;
  let url;
  try { url = targetFor(req.url); } catch { fail(res, 400, 'bad path'); return; }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.authorization;
  headers.authorization = 'Bearer ' + realKey;

  const lib = url.protocol === 'https:' ? https : http;
  const upReq = lib.request(
    {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      method: req.method,
      path: url.pathname + url.search,
      headers,
    },
    (upRes) => {
      console.log(`#${n} ${req.method} ${req.url} -> ${upRes.statusCode}`);
      const out = { ...upRes.headers };
      delete out.connection;
      delete out['keep-alive'];
      // 透传状态和头，然后边收边发 —— 绝不能 buffer，SSE 会卡住。
      res.writeHead(upRes.statusCode || 502, out);
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      if (res.socket) res.socket.setNoDelay(true);
      upRes.pipe(res);
      upRes.on('error', () => res.destroy());
    }
  );

  upReq.on('error', (err) => {
    console.log(`#${n} ${req.method} ${req.url} -> error ${err.code || err.message}`);
    fail(res, 502, 'upstream unreachable: ' + (err.code || err.message));
  });
  req.on('aborted', () => upReq.destroy());
  req.pipe(upReq);
});

await readStdin();
if (!realKey) {
  console.error('key-proxy: no key on stdin, refusing to start');
  process.exit(2);
}
server.listen(PORT, '127.0.0.1', () => {
  console.log(`key-proxy listening on http://127.0.0.1:${PORT} -> ${up.origin}${up.pathname} (key ${realKey.length} chars)`);
});