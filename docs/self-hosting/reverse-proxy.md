# HTTPS through a reverse proxy

Part of the [self-hosting guide](README.md).

The instance only listens on `127.0.0.1:3000`. To be reachable from outside, it needs a reverse proxy with TLS. Any proxy works as long as:

- it serves a domain or subdomain of its own and forwards `/` to `http://127.0.0.1:3000`
- it has a valid certificate
- it sets `X-Forwarded-For` and `X-Forwarded-Proto`
- it redirects HTTP to HTTPS

Behind any of these proxies, keep `SHIFTPLAN_TRUST_PROXY_HEADERS=true` from the [`.env` template](install-docker-compose.md#2-create-env), so sign-in lockouts see the real client address.

## Caddy (simplest)

Caddy fetches the certificate itself. `/etc/caddy/Caddyfile`:

```caddyfile
plan.example.de {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name plan.example.de;

    ssl_certificate     /etc/letsencrypt/live/plan.example.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/plan.example.de/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name plan.example.de;
    return 301 https://$host$request_uri;
}
```

`client_max_body_size` raises the nginx default limit of 1 MB, so larger Excel files are not rejected when importing rotation patterns.

## Traefik (file provider)

A router to the local port, for example in `dynamic/shiftplan.yml`:

```yaml
http:
  routers:
    shiftplan:
      rule: Host(`plan.example.de`)
      entryPoints: [websecure]
      service: shiftplan
      tls:
        certResolver: letsencrypt
  services:
    shiftplan:
      loadBalancer:
        servers:
          - url: http://127.0.0.1:3000
```

## Testing from outside

```bash
curl -sI https://plan.example.de/ | head -1
```

Expected: `HTTP/2 200`. Also check in a browser that no certificate error appears, including on a phone on the mobile network.

Next: [First setup and the Shiftplan app](first-setup-and-app.md).
