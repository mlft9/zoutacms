# ZoutaCMS

Plateforme de gestion d'hébergement web (WHMCS-like) — panel admin et espace client.

## Stack

- **Next.js 14** (App Router, output standalone)
- **PostgreSQL** + **Prisma 5**
- **NextAuth.js v4** (JWT, Credentials provider)
- **Tailwind CSS v3** + **TypeScript strict**
- **Vitest** pour les tests

## Prérequis

- Node.js 18+
- Docker & Docker Compose

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/your-username/zoutacms.git
cd zoutacms

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Démarrer la base de données
npm run docker:dev

# 5. Appliquer les migrations et seeder
npm run db:migrate
npm run db:seed

# 6. Lancer le serveur de développement
npm run dev
```

## Commande utiles

```bash
# 1. Vider les images 
docker system prune -af 2>&1

# 2. Reset le container 
docker compose down -v && docker compose build --no-cache && docker compose up -d
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Comptes de test

| Rôle  | Email                   | Mot de passe  |
|-------|-------------------------|---------------|
| Admin | admin@zoutacms.local    | Admin@123!    |
| Client| alice@example.com       | Client@123!   |
| Client| bob@example.com         | Client@123!   |

## URLs

| URL              | Description                          |
|------------------|--------------------------------------|
| `/login`         | Connexion espace client              |
| `/register`      | Inscription                          |
| `/admin/login`   | Connexion espace administration      |
| `/dashboard`     | Tableau de bord client               |
| `/admin/dashboard` | Tableau de bord admin              |

## Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # ESLint
npm run test         # Tests (Vitest)
npm run db:migrate   # Appliquer les migrations Prisma
npm run db:seed      # Seeder la base de données
npm run db:studio    # Prisma Studio
npm run docker:dev   # Démarrer PostgreSQL via Docker
npm run docker:prod  # Démarrer l'app complète via Docker
```

## Déploiement Docker

```bash
# Configurer .env avec les valeurs de production
cp .env.example .env

# Démarrer tous les services
npm run docker:prod
```

## Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les valeurs :

| Variable             | Description                              |
|----------------------|------------------------------------------|
| `DATABASE_URL`       | URL de connexion PostgreSQL              |
| `NEXTAUTH_SECRET`    | Secret JWT (min. 32 caractères)          |
| `NEXTAUTH_URL`       | URL de l'application                     |
| `SMTP_*`             | Configuration email (SMTP)               |

## Architecture

```
app/
├── (auth)/          # Pages publiques (login, register, etc.)
├── (admin)/         # Pages admin protégées (/admin/*)
├── (admin-auth)/    # Login admin (/admin/login)
├── (client)/        # Pages client protégées (/dashboard, /profile)
└── api/             # API Routes

lib/                 # Utilitaires (auth, prisma, validations…)
components/          # Composants React réutilisables
prisma/              # Schéma et migrations
types/               # Types TypeScript globaux
__tests__/           # Tests Vitest
```

## Fonctionnalités (Phase 1)

- Authentification (inscription, connexion, déconnexion)
- Double portail : espace client `/login` et espace admin `/admin/login`
- Un compte admin peut se connecter en tant que client
- Authentification à deux facteurs (TOTP / Google Authenticator)
- Réinitialisation de mot de passe par email
- Rate limiting sur les tentatives de connexion
- Gestion du profil (nom, email, mot de passe, 2FA)
- Thème clair / sombre

## Licence

Propriétaire — tous droits réservés.
