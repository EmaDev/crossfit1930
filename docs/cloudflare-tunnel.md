# Cloudflare Tunnel (dev)

Expone el dev server local (`http://localhost:3002`) en una URL pública HTTPS
sin abrir puertos ni tocar el router. Útil para probar la PWA en el celular,
el login con Google (dominio HTTPS real) o para pasarle un link a alguien.

## Uso

Dos terminales:

```bash
npm run dev      # levanta Next en :3002
npm run tunnel   # abre el túnel y muestra la URL pública
```

`npm run tunnel` corre `scripts/tunnel.mjs`, que además del log de `cloudflared`
imprime un banner claro con la ruta pública:

```
────────────────────────────────────────────────────────
  Tunnel Cloudflare activo
  http://localhost:3002  →  https://xxxx.trycloudflare.com
────────────────────────────────────────────────────────
```

Esa URL apunta al `:3002` local mientras el comando siga corriendo. Es un
**Quick Tunnel**: efímero y anónimo, la URL cambia en cada corrida y no
requiere cuenta de Cloudflare ni dominio.

## Cómo está armado

- Dependencia de dev: [`cloudflared`](https://www.npmjs.com/package/cloudflared)
  (descarga el binario oficial en `npm install`, multiplataforma).
- Script en `package.json`: `"tunnel": "node scripts/tunnel.mjs"`.
- `scripts/tunnel.mjs` lanza el binario (`cloudflared tunnel --url http://localhost:3002`),
  reemite su log y resalta la URL `*.trycloudflare.com` en un banner. `Ctrl+C` cierra el túnel.

## Notas

- **Login con Google / Firebase Auth**: agregá el dominio `*.trycloudflare.com`
  (o la URL exacta de la corrida) en Firebase Console → Authentication →
  Settings → Authorized domains, si querés probar el flujo OAuth por el túnel.
- Para una URL **fija con dominio propio** hay que pasar a un *named tunnel*
  (`cloudflared login` + `config.yml`). No está configurado acá.
