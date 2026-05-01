# Liana — Vue 3 + Vite + API Node (Hono)

Ce repo contient :

- **Front** : Vue 3 + Vite → build statique dans `dist/`
- **Back** : API Node (Hono) dans `backend/server.ts` → écoute par défaut sur `127.0.0.1:3000`
- **Objectif en prod** : Apache sert `dist/` et reverse-proxy **uniquement** `/api/*` vers le backend.

## Documentation projet

- Présentation fonctionnelle de la plateforme : [docs/plateforme.md](docs/plateforme.md)

## Développement local

```bash
npm run dev
```

## Variables d’environnement (local / prod)

Ne pas mettre de secrets dans le repo.

- Front : copier `.env.example` → `.env` (optionnel)
- Back : copier `backend/.env.example` → `backend/.env` (obligatoire en prod)
- Firebase Admin : placer `backend/firebase-adminsdk.json` sur le serveur (secret)

## Mise en ligne sur le VPS (routine)

Les commandes ci-dessous reflètent le flow “build local → rsync → restart services”.

### Option : script de déploiement (recommandé)

- [ ] Lancer :

```bash
chmod +x ./scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

Si tu dois aussi uploader des secrets :

```bash
./scripts/deploy-vps.sh --sync-front-env --sync-firebase-adminsdk /chemin/vers/firebase-adminsdk.json
```

Si le PM2 du VPS pointe encore vers un ancien `backend/server.js`, force la recréation :

```bash
./scripts/deploy-vps.sh --bootstrap-pm2
```

### 0) Variables (pour éviter de retaper)

```bash
export VPS_HOST="82.112.255.95"
export VPS_USER="root"
export APP_DIR="/var/www/html/isaure/sites_mariage/gpl2026"
export DOMAIN="gpl2026.com"
```

### 1) Frontend (Vite → `dist/`)

- [ ] Build en local

```bash
npm run build
```

- [ ] Sync vers le VPS (avec permissions safe pour Apache)

```bash
rsync -avz --delete --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/dist/"
```

### 2) Backend (API Hono → PM2)

- [ ] Vérifier `backend/.env` sur le VPS (au minimum)
  - `NODE_ENV=production`
  - `CORS_ORIGINS=https://www.${DOMAIN},https://${DOMAIN}`
  - `SESSION_SECRET=...` (obligatoire)
  - `SECURE_PASSWORD=...` (obligatoire)

- [ ] Sync du code backend

```bash
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  backend/ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/backend/"
```

- [ ] Sur le VPS : installer deps si besoin + redémarrer PM2

```bash
ssh "${VPS_USER}@${VPS_HOST}"
cd "${APP_DIR}/backend"
npm ci
pm2 restart gpl2026
pm2 status
```

### 3) Dossier `shared/`

- [ ] Sync

```bash
rsync -avz --delete \
  shared/ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/shared/"
```

### 4) Reload Apache + smoke tests

- [ ] Reload Apache (si conf inchangée, un reload suffit)

```bash
ssh "${VPS_USER}@${VPS_HOST}" "sudo systemctl reload apache2"
```

- [ ] Vérifier que l’API répond

```bash
curl -sSf "https://${DOMAIN}/api/health" | cat
curl -sSf "https://${DOMAIN}/api/ready" | cat
```

- [ ] Vérifier que le front charge (manuellement) : `https://${DOMAIN}/`

## Rollback rapide (si un déploiement casse)

### Frontend

Si tu as un backup de `dist/` (recommandé), repousse-le :

```bash
# Exemple : dist_backup/ contient un ancien build
rsync -avz --delete --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist_backup/ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/dist/"
ssh "${VPS_USER}@${VPS_HOST}" "sudo systemctl reload apache2"
```

Astuce : pour garder un backup automatiquement, tu peux déployer avec :

```bash
rsync -avz --delete --backup --backup-dir="dist_backups/$(date +%F_%H%M%S)" \
  dist/ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/dist/"
```

### Backend

```bash
ssh "${VPS_USER}@${VPS_HOST}"
pm2 restart gpl2026
pm2 logs gpl2026 --lines 200
```

## (Une fois) Setup PM2 sur le VPS

Si le process PM2 n’existe pas encore :

```bash
ssh "${VPS_USER}@${VPS_HOST}"
cd "${APP_DIR}/backend"
npm ci

# Option A (recommandée) : Node + tsx loader
pm2 start node --name gpl2026 -- --import tsx server.ts

# Option B : via npm (si tu préfères)
# pm2 start npm --name gpl2026 -- run start

pm2 save
```

## (Une fois) Setup Apache (recommandé : statique + proxy /api)

Modules utiles :

```bash
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl reload apache2
```

Exemple de vhost (adapter chemins/domaines). But : servir `dist/` et proxy `/api/` :

```apacheconf
<VirtualHost *:80>
  ServerName gpl2026.com
  ServerAlias www.gpl2026.com

  DocumentRoot /var/www/html/isaure/sites_mariage/gpl2026/dist
  <Directory /var/www/html/isaure/sites_mariage/gpl2026/dist>
    Options FollowSymLinks
    AllowOverride None
    Require all granted
  </Directory>

  # Certbot challenge (si tu utilises webroot)
  ProxyPass /.well-known/acme-challenge/ !

  # API → backend local
  ProxyPreserveHost On
  ProxyPass        /api http://127.0.0.1:3000/api
  ProxyPassReverse /api http://127.0.0.1:3000/api

  # SPA fallback (ne pas casser /api ni les fichiers existants)
  RewriteEngine On
  RewriteCond %{REQUEST_URI} ^/api/ [OR]
  RewriteCond %{REQUEST_URI} ^/.well-known/acme-challenge/
  RewriteRule .* - [L]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule .* - [L]
  RewriteRule .* /index.html [L]
</VirtualHost>
```

## Problème : images / assets inaccessibles (permissions)

Si Apache ne peut pas lire `dist/assets/*` :

- Recommandé : utiliser `rsync --chmod=...` (voir commande plus haut).
- Sinon (fallback) :

```bash
ssh "${VPS_USER}@${VPS_HOST}"
cd "${APP_DIR}/dist"
find assets -type f -exec chmod 644 {} \;
find assets -type d -exec chmod 755 {} \;
```

## Debug (quand ça ne marche pas)

```bash
# PM2
pm2 status
pm2 describe gpl2026
pm2 logs gpl2026 --lines 200

# Apache
sudo systemctl status apache2 --no-pager
sudo apachectl -t
sudo tail -n 200 /var/log/apache2/*error*.log
```

## Commandes admin (scripts)

### Créer un superadmin

Le script est en TypeScript :

```bash
node --import tsx backend/scripts/createSuperadmin.ts "<EMAIL>" "<MOT_DE_PASSE_FORT>"
```

### Créer le couple dans la DB

```bash
npm --prefix backend run seed:couple
```

### Déployer les règles Firestore

```bash
firebase deploy --only firestore:rules
```
