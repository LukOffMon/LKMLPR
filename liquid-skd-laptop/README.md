# Liquid SKd · laptop de casa

Tu laptop vieja como servidor de **Liquid ATK + SKd** (Soulseek), sin tarjeta y sin abrir puertos: Docker con slskd, el puente de Liquid y Tailscale Funnel.

**Empieza aquí → [PROTOCOLO.md](PROTOCOLO.md)**

| Archivo | Qué es |
|---|---|
| `instalar.sh` | Lo instala y lo deja funcionando (se puede repetir) |
| `docker-compose.yml` | slskd + puente + Tailscale |
| `funnel.json` | Tailscale Funnel: `https://<nombre>.<tu-red>.ts.net` → puente |
| `puente/` | El puente de Liquid (Node, sin dependencias) y sus tests |
| `.env.example` | Qué guarda `.env` (lo crea el instalador; nunca se sube) |
