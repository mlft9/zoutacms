# Cahier des Charges — ZoutaCMS

## Vue d'ensemble du projet

### Nom du projet

**ZoutaCMS** — Plateforme de gestion d'hébergement et de services cloud.

### Objectif

Développer une plateforme de gestion d'hébergement inspirée de WHMCS, permettant de gérer des clients, des services (VPS et serveurs Minecraft), la facturation, et le provisionnement automatique via un système de plugins extensible. L'architecture est conçue pour être mono-tenant dans un premier temps, avec une structure de données préparée pour une évolution multi-tenant future (isolation par `tenantId`).

### Stack technique

| Composant | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Authentification | NextAuth.js (email/password + 2FA TOTP) |
| UI | Design sobre et fonctionnel, composants React |
| Graphiques | Recharts |
| Paiement | Stripe |
| Provisionnement | Système de plugins (Pelican, Proxmox, Hetzner) |

### Architecture

Application monolithique Next.js avec API interne (Route Handlers). Le système de plugins permet l'extensibilité vers de nouveaux providers sans modifier le cœur de l'application. L'architecture est conçue pour évoluer vers des microservices si nécessaire.

---

## Phase 1 — Fondations & Authentification

### Objectif

Mettre en place le socle technique du projet : structure Next.js, base de données, système d'authentification complet avec 2FA, et layouts de base.

### Fonctionnalités

#### Setup du projet

- Initialisation Next.js 14 avec App Router
- Configuration Prisma + PostgreSQL
- Structure des dossiers et conventions de nommage :
  - `app/(auth)/` — pages d'authentification (login, register, forgot-password)
  - `app/(admin)/` — espace administration
  - `app/(client)/` — espace client
  - `lib/` — utilitaires, config Prisma, helpers
  - `components/` — composants réutilisables (UI, layout)
  - `types/` — types TypeScript partagés

#### Authentification (NextAuth.js)

- Login par email / mot de passe
- Hash des mots de passe avec bcrypt
- Sessions JWT
- Middleware de protection des routes selon le rôle
- Système de rôles : `ADMIN` et `CLIENT`
- Guards sur les pages et les API routes
- **2FA TOTP** : activation/désactivation par l'utilisateur, génération QR code, vérification au login

#### Pages

- `/login` — connexion avec champ 2FA conditionnel
- `/register` — inscription nouveau client
- `/forgot-password` — réinitialisation du mot de passe
- `/profile` — édition des infos personnelles, changement de mot de passe, gestion 2FA

#### Layout global

- Sidebar responsive avec navigation selon le rôle (admin vs client)
- Header avec infos utilisateur connecté et menu déroulant (profil, déconnexion)
- Toggle dark mode (basique, pas prioritaire)

#### Schéma Prisma

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  firstName     String?
  lastName      String?
  role          Role      @default(CLIENT)
  totpSecret    String?
  totpEnabled   Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Role {
  ADMIN
  CLIENT
}
```

### Critères de validation

- [ ] Un utilisateur peut s'inscrire, se connecter et se déconnecter
- [ ] Le 2FA TOTP fonctionne (activation, QR code, vérification au login)
- [ ] Les routes admin sont inaccessibles à un client et inversement
- [ ] Le layout s'affiche correctement avec sidebar et header
- [ ] Le toggle dark mode fonctionne

---

## Phase 2 — Panel Admin & Gestion Clients

### Objectif

Construire l'espace d'administration avec un dashboard visuel, la gestion complète des clients, et la gestion manuelle des services (sans provisionnement automatique).

### Fonctionnalités

#### Dashboard admin

- KPIs affichés : nombre total de clients, services actifs, services suspendus, revenus (préparé pour la phase 6)
- Graphiques avec Recharts : évolution des inscriptions, répartition des services par type et par statut
- Activité récente (dernières actions loguées)

#### Gestion des clients

- Liste paginée avec recherche textuelle et filtres (statut du compte, date d'inscription)
- Fiche client détaillée : infos personnelles, liste des services liés, statut du compte
- Création manuelle d'un client par l'admin
- Actions sur un client : suspendre, activer, supprimer le compte
- **Notes internes** : l'admin peut ajouter des notes privées sur un client (non visibles par le client)

#### Gestion manuelle des services

- CRUD complet pour créer un service et l'associer à un client
- Champs : type (VPS, Minecraft), statut (actif, suspendu, en attente, résilié), paramètres techniques (RAM, CPU, slots, IP, port…)
- Pas de provisionnement automatique à ce stade, uniquement du déclaratif

#### Logs / Journal des actions admin

- Enregistrement automatique des actions : création, modification, suppression de clients et services
- Chaque log contient : qui (admin), quoi (action), quand (timestamp), sur quoi (entité concernée)
- Page de consultation des logs avec filtres par type d'action et par date

#### Schéma Prisma étendu

```prisma
model Service {
  id          String        @id @default(cuid())
  name        String
  type        ServiceType
  status      ServiceStatus @default(PENDING)
  config      Json          // RAM, CPU, slots, IP, port, etc.
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

enum ServiceType {
  VPS
  MINECRAFT
}

enum ServiceStatus {
  ACTIVE
  SUSPENDED
  PENDING
  TERMINATED
}

model AdminNote {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  adminId   String
  admin     User     @relation("AdminNotes", fields: [adminId], references: [id])
  createdAt DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entity     String
  entityId   String
  adminId    String
  admin      User     @relation(fields: [adminId], references: [id])
  details    Json?
  createdAt  DateTime @default(now())
}
```

### Critères de validation

- [ ] Le dashboard affiche les KPIs et les graphiques correctement
- [ ] CRUD clients fonctionnel (créer, lire, modifier, suspendre, supprimer)
- [ ] CRUD services fonctionnel (créer, associer à un client, modifier le statut)
- [ ] Les notes internes s'affichent sur la fiche client
- [ ] Les logs enregistrent toutes les actions admin
- [ ] La recherche et les filtres fonctionnent sur la liste des clients

---

## Phase 3 — Dashboard Client

### Objectif

Créer l'espace client avec une interface sobre et fonctionnelle, permettant au client de voir ses services, préparer les actions futures (provisionnement), et naviguer dans son espace.

### Fonctionnalités

#### Dashboard client

- Vue d'ensemble avec pastilles de statut (vert = actif, orange = suspendu, rouge = terminé)
- Résumé rapide : nombre de services actifs, prochain renouvellement (placeholder pour phase 6)

#### Liste des services

- Tableau des services du client avec colonnes : nom, type, statut, IP, date de création
- Filtres par type (VPS / Minecraft) et par statut

#### Page détail d'un service

- Affichage complet des infos techniques : IP, port, RAM, CPU, slots, etc.
- Indicateur de statut en temps réel
- **Boutons d'actions préparés** (restart, accès console, stop/start) — affichés mais désactivés ou avec un état "bientôt disponible", prêts à être câblés en phase 4
- Zone prévue pour les métriques (placeholder pour phase 5)

#### Page "Mes factures"

- Page accessible dans la navigation client
- Affiche un message placeholder du type "Aucune facture pour le moment"
- Structure prête à accueillir la liste des factures en phase 6

#### Gestion du profil (enrichie)

- Édition des infos personnelles (nom, email)
- Changement de mot de passe
- Gestion du 2FA : activer, désactiver, régénérer les codes

#### Style et UX

- Design sobre et fonctionnel, pas de fioritures
- Composants réutilisables entre admin et client (tableaux, badges de statut, cartes)
- Interface responsive

### Critères de validation

- [ ] Le client voit uniquement ses propres services
- [ ] Les boutons d'actions sont visibles mais correctement désactivés
- [ ] La page factures affiche le placeholder
- [ ] Le profil et la gestion 2FA fonctionnent
- [ ] L'interface est responsive et sobre

---

## Phase 4 — Architecture Plugins & Provisionnement

### Objectif

Implémenter le système de plugins extensible et les trois premiers providers (Pelican, Proxmox, Hetzner), avec provisionnement automatique et console intégrée dans le panel.

### Fonctionnalités

#### Système de plugins (architecture Provider)

Interface TypeScript commune que chaque plugin doit implémenter :

```typescript
interface ServiceProvider {
  // Identité du plugin
  name: string;
  type: ServiceType; // VPS | MINECRAFT
  
  // Cycle de vie
  create(config: ProvisionConfig): Promise<ProvisionResult>;
  suspend(externalId: string): Promise<void>;
  unsuspend(externalId: string): Promise<void>;
  terminate(externalId: string): Promise<void>;
  restart(externalId: string): Promise<void>;
  
  // Statut et infos
  getStatus(externalId: string): Promise<ServiceHealthStatus>;
  getConsoleUrl(externalId: string): Promise<string>;
  
  // Métriques (optionnel, pour phase 5)
  getMetrics?(externalId: string): Promise<ServiceMetrics>;
  
  // Test de connexion
  testConnection(): Promise<boolean>;
}
```

- Registre de plugins chargé dynamiquement
- Configuration par plugin stockée en base (clés API, URLs, tokens)
- Schéma Prisma étendu avec `ProviderConfig` et `externalId` sur les services

#### Plugin Pelican Panel (Minecraft)

- Communication via l'API REST Pelican
- Création de serveurs : mapping des plans vers les paramètres Pelican (eggs, nests, allocations, limites RAM/CPU)
- Actions : start, stop, restart, suspend, unsuspend, terminate
- Récupération du statut du serveur
- **Console intégrée** : intégration du websocket Pelican pour afficher la console du serveur directement dans le panel client

#### Plugin Proxmox (VPS)

- Communication via l'API REST Proxmox VE
- Création de VMs/containers (LXC ou QEMU) selon la config du plan
- Actions : start, stop, restart, suspend, unsuspend, terminate
- Récupération du statut
- **Console intégrée** : proxy noVNC ou xterm.js pour accéder à la console depuis le panel

#### Plugin Hetzner Cloud (VPS)

- Communication via l'API Hetzner Cloud
- Création de serveurs cloud avec choix du type, de l'image et de la localisation
- Actions : start, stop, restart, rebuild, terminate
- Récupération du statut et des IPs
- **Console intégrée** : via l'URL de console VNC fournie par l'API Hetzner

#### Câblage avec les phases précédentes

- Les boutons d'actions de la phase 3 deviennent fonctionnels selon le plugin du service
- Le CRUD services de la phase 2 déclenche le provisionnement automatique via le plugin associé
- Ajout de l'`externalId` (ID du service chez le provider) sur le modèle Service

#### Gestion des échecs de provisionnement

Le provisionnement est une opération critique qui peut échouer. Voici le comportement attendu :

- **Provider indisponible** (API down, timeout) : le service passe en état `PROVISIONING_FAILED`, l'admin est notifié immédiatement (notification panel + email), le client voit un message clair ("Votre service est en cours de création, notre équipe a été notifiée d'un problème"). Un retry automatique est planifié (3 tentatives avec backoff exponentiel : 1 min, 5 min, 15 min).
- **Erreur de configuration** (quota dépassé, paramètres invalides) : le service passe en `PROVISIONING_FAILED` avec le détail de l'erreur stocké en base. Pas de retry automatique, l'admin doit corriger la configuration et relancer manuellement.
- **Timeout** : si le provisionnement n'est pas confirmé après 10 minutes (configurable), le service passe en `PROVISIONING_TIMEOUT`. Un check de statut est envoyé au provider pour vérifier si la ressource a été créée malgré le timeout.
- **Provisionnement partiel** : si le provider crée la ressource mais que la synchronisation échoue (l'`externalId` n'est pas récupéré), le service est marqué `REQUIRES_MANUAL_CHECK` et l'admin doit vérifier manuellement côté provider.
- **Interface admin** : une page dédiée "Provisionnements en erreur" liste tous les services en échec avec les détails de l'erreur, un bouton "Retenter" et un bouton "Annuler".
- **Interface client** : le client voit l'état en temps réel de son service avec un message adapté à chaque situation, sans détails techniques internes.

Les nouveaux statuts à ajouter au modèle Service :

```prisma
enum ServiceStatus {
  PENDING
  PROVISIONING
  PROVISIONING_FAILED
  PROVISIONING_TIMEOUT
  REQUIRES_MANUAL_CHECK
  ACTIVE
  SUSPENDED
  TERMINATING
  TERMINATED
}
```

#### Page admin "Plugins"

- Liste des plugins disponibles avec statut (activé/désactivé)
- Formulaire de configuration par plugin (URL API, token, paramètres spécifiques)
- Bouton "Tester la connexion" pour vérifier les credentials
- Logs de provisionnement (succès/échecs)

#### Schéma Prisma étendu

```prisma
model ProviderConfig {
  id         String   @id @default(cuid())
  provider   String   // "pelican", "proxmox", "hetzner"
  name       String   // Nom affiché (ex: "Proxmox Node 1")
  config     Json     // URL, token, paramètres spécifiques
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// Ajout sur le modèle Service :
// externalId   String?   — ID du service chez le provider
// providerId   String?   — Référence vers ProviderConfig
```

### Critères de validation

- [ ] L'interface Provider est définie et documentée
- [ ] Le plugin Pelican crée et gère des serveurs Minecraft via l'API
- [ ] Le plugin Proxmox crée et gère des VMs/containers via l'API
- [ ] Le plugin Hetzner crée et gère des serveurs cloud via l'API
- [ ] La console est accessible directement dans le panel pour les trois plugins
- [ ] La création d'un service en admin déclenche le provisionnement automatique
- [ ] La page admin "Plugins" permet de configurer et tester chaque provider
- [ ] Les boutons d'actions côté client sont fonctionnels

---

## Phase 5 — Monitoring

### Objectif

Mettre en place un système de surveillance des services avec health checks, dashboard de monitoring, historique d'uptime, et alertes multi-canaux.

### Fonctionnalités

#### Health checks périodiques

- Job planifié (cron ou équivalent Next.js) qui interroge chaque plugin via `getStatus()`
- Fréquence configurable par l'admin (1, 5, 15, 30 min)
- Chaque résultat de check est stocké en base pour l'historique
- Détection des changements de statut (up → down, down → up)

#### Dashboard monitoring admin

- Vue globale de tous les services avec statut en temps réel
- Filtres par statut (up / down / dégradé), par type de service, par serveur/provider
- Taux d'uptime par service et par nœud (provider)
- Liste des incidents récents

#### Monitoring côté client

- Sur la page détail du service : indicateur de statut en temps réel
- Graphique d'uptime : dernières 24h, 7 jours, 30 jours
- Historique des incidents (date, durée, résolution)

#### Métriques de base

- Affichage des métriques basiques récupérées via les plugins (statut up/down principalement)
- Préparation de l'interface pour des métriques détaillées (CPU, RAM, réseau) dans une future itération

#### Système d'alertes multi-canaux

- **Notification dans le panel** : badge / indicateur dans le header admin + page dédiée des alertes
- **Email** : envoi d'un email à l'admin (et éventuellement au client concerné) quand un service tombe
- **Webhook** : envoi d'un payload JSON vers une URL configurable (Discord, Slack, etc.)
- Configuration des alertes par l'admin : activer/désactiver chaque canal, définir les destinataires, cooldown entre les alertes pour éviter le spam

#### Schéma Prisma étendu

```prisma
model HealthCheck {
  id         String              @id @default(cuid())
  serviceId  String
  service    Service             @relation(fields: [serviceId], references: [id])
  status     HealthCheckStatus
  latency    Int?                // ms
  details    Json?
  createdAt  DateTime            @default(now())
}

enum HealthCheckStatus {
  UP
  DOWN
  DEGRADED
}

model Alert {
  id         String   @id @default(cuid())
  serviceId  String
  service    Service  @relation(fields: [serviceId], references: [id])
  type       String   // "down", "up", "degraded"
  channels   Json     // canaux notifiés
  resolvedAt DateTime?
  createdAt  DateTime @default(now())
}

model AlertConfig {
  id             String  @id @default(cuid())
  emailEnabled   Boolean @default(true)
  emailRecipients Json    // liste d'emails
  webhookEnabled Boolean @default(false)
  webhookUrl     String?
  panelEnabled   Boolean @default(true)
  cooldownMinutes Int    @default(5)
}
```

### Critères de validation

- [ ] Les health checks s'exécutent automatiquement à la fréquence configurée
- [ ] Le dashboard monitoring admin affiche le statut en temps réel de tous les services
- [ ] Le client voit l'uptime et l'historique des incidents sur ses services
- [ ] Les alertes sont envoyées via les trois canaux (panel, email, webhook)
- [ ] Le cooldown entre les alertes fonctionne correctement
- [ ] L'admin peut configurer la fréquence et les canaux d'alerte

---

## Phase 6 — Facturation & Paiements

### Objectif

Fermer la boucle commerciale avec un catalogue de produits, la facturation récurrente, l'intégration Stripe, la génération de factures PDF, et la suspension automatique en cas d'impayé.

### Fonctionnalités

#### Catalogue produits

- L'admin crée des produits : nom, description, type de service (VPS/Minecraft), provider associé
- Chaque produit a des plans tarifaires : mensuel, trimestriel, annuel
- Chaque plan est lié à une configuration de provisionnement (RAM, CPU, slots, etc.)
- Produits activables/désactivables

#### Cycle de facturation

- Génération automatique des factures à chaque période de renouvellement
- Statuts de facture : `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`
- Rappels automatiques :
  - X jours avant l'échéance (rappel de renouvellement)
  - Le jour de l'échéance
  - X jours après (rappel d'impayé)
- Délais configurables par l'admin

#### Intégration Stripe

- Paiement par carte via Stripe Checkout
- Webhooks Stripe pour synchroniser les statuts de paiement en temps réel
- Gestion des erreurs de paiement (carte refusée, expirée, etc.)
- **Stripe Customer Portal** : le client peut accéder au portail Stripe pour gérer ses moyens de paiement (ajouter/modifier/supprimer une carte), consulter son historique de paiement Stripe, et annuler un abonnement. Accessible via un bouton "Gérer mon moyen de paiement" dans l'espace client. Cela évite de recoder toute la logique de gestion de cartes côté ZoutaCMS.

#### Suspension automatique

- Si une facture reste impayée après X jours (configurable) : suspension automatique du service via le plugin
- Réactivation automatique du service au paiement de la facture
- Résiliation définitive après Y jours supplémentaires (configurable)
- Notifications au client à chaque étape (email + panel)

#### Factures PDF

- Génération automatique de factures PDF téléchargeables
- Contenu : infos client, détail du service, période, montant, statut de paiement
- Accessibles depuis l'espace client (page "Mes factures") et depuis la fiche client côté admin

#### Page "Mes factures" côté client

- La page placeholder de la phase 3 affiche maintenant les vraies factures
- Historique des factures avec statut, montant, date, et lien de téléchargement PDF
- Bouton de paiement pour les factures en attente
- Résumé du prochain renouvellement

#### Rapports financiers admin

- Intégrés au dashboard admin (phase 2)
- Métriques : revenus mensuels, MRR (Monthly Recurring Revenue), factures impayées, taux de churn
- Graphiques avec Recharts

#### Schéma Prisma étendu

```prisma
model Product {
  id          String        @id @default(cuid())
  name        String
  description String?
  serviceType ServiceType
  providerId  String?
  provider    ProviderConfig? @relation(fields: [providerId], references: [id])
  isActive    Boolean       @default(true)
  plans       Plan[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Plan {
  id                 String        @id @default(cuid())
  name               String
  productId          String
  product            Product       @relation(fields: [productId], references: [id])
  priceMonthly       Decimal
  priceQuarterly     Decimal?
  priceAnnual        Decimal?
  provisionConfig    Json          // config envoyée au plugin
  isActive           Boolean       @default(true)
  createdAt          DateTime      @default(now())
}

model Invoice {
  id              String        @id @default(cuid())
  invoiceNumber   String        @unique
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  serviceId       String
  service         Service       @relation(fields: [serviceId], references: [id])
  amount          Decimal
  status          InvoiceStatus @default(PENDING)
  dueDate         DateTime
  paidAt          DateTime?
  stripeSessionId String?
  pdfUrl          String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

model BillingConfig {
  id                        String @id @default(cuid())
  reminderDaysBefore        Int    @default(3)
  gracePeriodDays           Int    @default(7)
  terminationDays           Int    @default(30)
  stripePublishableKey      String?
  stripeSecretKey           String?
  stripeWebhookSecret       String?
}
```

### Critères de validation

- [ ] L'admin peut créer des produits avec des plans tarifaires
- [ ] Les factures sont générées automatiquement à chaque renouvellement
- [ ] Le paiement via Stripe Checkout fonctionne
- [ ] Les webhooks Stripe mettent à jour le statut des factures en temps réel
- [ ] La suspension automatique se déclenche après le délai configuré
- [ ] La réactivation automatique fonctionne au paiement
- [ ] Les factures PDF sont générées et téléchargeables
- [ ] Les rapports financiers s'affichent dans le dashboard admin
- [ ] Les rappels email sont envoyés aux bonnes échéances

---

## Récapitulatif des phases

| Phase | Intitulé | Dépendances |
|---|---|---|
| 1 | Fondations & Auth | Aucune |
| 2 | Panel Admin & Gestion Clients | Phase 1 |
| 3 | Dashboard Client | Phase 1, Phase 2 |
| 4 | Architecture Plugins & Provisionnement | Phase 2, Phase 3 |
| 5 | Monitoring | Phase 4 |
| 6 | Facturation & Paiements | Phase 2, Phase 3, Phase 4 |

## Exigences transversales

Ces sections s'appliquent à **toutes les phases** du projet. Elles doivent être prises en compte dès la phase 1 et maintenues tout au long du développement.

---

### Sécurité

La plateforme gère des credentials d'API, des paiements et des accès serveurs. La sécurité n'est pas optionnelle, c'est un pilier du projet.

#### Chiffrement et stockage des secrets

- Les clés API des plugins (Pelican, Proxmox, Hetzner), tokens Stripe et autres secrets doivent être chiffrés en base de données (AES-256-GCM ou équivalent), jamais stockés en JSON brut
- Utiliser une clé de chiffrement maître stockée dans les variables d'environnement
- Les mots de passe utilisateurs hashés avec bcrypt (coût minimum : 12)
- Aucun secret ne doit apparaître dans les logs ou les réponses API

#### Protection de l'authentification

- Rate limiting agressif sur les routes d'auth : maximum 5 tentatives de login par minute par IP, blocage temporaire après 10 échecs consécutifs
- Enregistrement de chaque tentative de connexion échouée dans l'audit trail (IP, timestamp, email tenté)
- Protection CSRF sur tous les formulaires
- Sessions JWT avec expiration courte (15 min access token, refresh token en httpOnly cookie)
- Politique de mots de passe : minimum 8 caractères, au moins une majuscule, un chiffre et un caractère spécial

#### Audit trail orienté sécurité

Au-delà des logs admin de la phase 2, un audit trail sécurité doit tracer :
- Les tentatives de connexion (réussies et échouées)
- Les changements de permissions ou de rôle
- Les accès aux configurations de plugins (lecture et modification des credentials)
- Les actions de provisionnement (création, suppression de services)
- Les accès console
- Chaque entrée contient : utilisateur, IP, action, timestamp, résultat (succès/échec)

#### Validation et sanitization

- Validation de tous les inputs côté serveur avec Zod
- Sanitization des données affichées pour prévenir les XSS
- Protection contre les injections SQL (assurée par Prisma, mais vigilance sur les raw queries)
- Validation stricte des paramètres envoyés aux API des plugins avant transmission

#### RBAC (préparation)

- Le système de rôles doit être conçu pour être extensible : `ADMIN`, `CLIENT` pour le MVP, mais la structure doit permettre d'ajouter des rôles intermédiaires (`SUPPORT`, `RESELLER`) sans refactoring majeur
- Utiliser un middleware centralisé de vérification des permissions

---

### Gestion d'erreurs & Jobs asynchrones

Les phases 4 à 6 communiquent avec des API externes (Pelican, Proxmox, Hetzner, Stripe) qui peuvent être lentes, indisponibles ou retourner des erreurs inattendues. La résilience est critique.

#### Système de queue / jobs asynchrones

- Utiliser un système de jobs pour toutes les opérations longues : provisionnement de services, health checks, génération de factures PDF, envoi d'emails et webhooks
- Technologie recommandée : BullMQ avec Redis, ou une solution plus légère comme `pg-boss` (basé sur PostgreSQL, pas de dépendance supplémentaire)
- Chaque job doit avoir un statut traçable : `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`

#### Mécanisme de retry

- Retry automatique avec backoff exponentiel pour les appels API échoués (1s, 4s, 16s, 64s…)
- Nombre maximum de tentatives configurable (par défaut : 5)
- Après le dernier échec, marquer le job comme `FAILED` et notifier l'admin
- Dead letter queue pour les jobs définitivement échoués

#### Gestion des états intermédiaires

- Un service en cours de provisionnement est dans l'état `PROVISIONING` (pas directement `ACTIVE`)
- Un service en cours de suppression est dans l'état `TERMINATING`
- L'interface affiche clairement ces états transitoires avec un indicateur de progression
- Timeout configurable : si un provisionnement ne se termine pas dans un délai donné, passer en état `FAILED` et alerter l'admin

#### Réponses API standardisées

- Toutes les API routes retournent un format JSON cohérent :
  ```json
  {
    "success": true|false,
    "data": { ... },
    "error": { "code": "ERROR_CODE", "message": "Description lisible" }
  }
  ```
- Codes d'erreur métier documentés (ex: `PROVIDER_UNREACHABLE`, `QUOTA_EXCEEDED`, `INVALID_CONFIG`)

---

### Stratégie de tests

Les tests ne sont pas optionnels. Ils garantissent que chaque phase fonctionne individuellement et que les phases suivantes ne cassent pas les précédentes.

#### Tests unitaires

- Couvrir la logique métier critique :
  - Calcul de facturation (prorata, renouvellement, prix selon la période)
  - Logique de suspension automatique (délais, transitions d'état)
  - Validation des configurations de plugins
  - Vérification des permissions RBAC
- Framework recommandé : Vitest (rapide, compatible TypeScript/Next.js)

#### Tests d'intégration

- Tester les API routes de bout en bout avec une base de données de test (PostgreSQL en Docker ou SQLite en mémoire via Prisma)
- Scénarios clés à couvrir :
  - Inscription → login → accès dashboard
  - Création de service → provisionnement → changement de statut
  - Facture générée → paiement Stripe → réactivation
  - Accès refusé pour un client sur une route admin

#### Mocks des API externes

- Chaque plugin doit avoir un mock implémentant la même interface `ServiceProvider`
- Les mocks simulent les réponses des API (Pelican, Proxmox, Hetzner, Stripe) sans appel réseau
- Un flag `USE_MOCKS=true` dans les variables d'environnement permet de basculer
- Les mocks doivent aussi simuler les cas d'erreur (timeout, 500, quota dépassé)

#### Tests E2E (optionnel, phase ultérieure)

- Playwright ou Cypress pour tester les parcours utilisateur complets dans le navigateur
- Priorité basse : à envisager une fois les phases 1 à 3 stables

#### Intégration continue

- Un script `npm run test` qui exécute tous les tests
- Objectif de couverture : 80% minimum sur la logique métier, pas d'obligation sur les composants UI

---

### Documentation API & Plugins

La documentation est ce qui transforme un projet perso en projet professionnel. Elle permet aussi à Claude Code de mieux comprendre le contexte pour les phases suivantes.

#### Documentation de l'interface Provider

- Un fichier `docs/plugins/PROVIDER_INTERFACE.md` détaillant :
  - L'interface TypeScript complète avec description de chaque méthode
  - Les types d'entrée et de sortie attendus
  - Le cycle de vie d'un service (diagramme d'états)
  - Un guide pas-à-pas pour créer un nouveau plugin
- Un plugin d'exemple (`ExampleProvider`) qui implémente l'interface avec des données fictives, servant de template

#### Documentation des API routes

- Un fichier `docs/api/ROUTES.md` listant toutes les routes avec :
  - Méthode HTTP et URL
  - Paramètres attendus (body, query, params)
  - Réponse type (succès et erreur)
  - Rôle requis (admin, client, public)
- Idéalement généré ou synchronisé avec un schéma Zod partagé

#### README technique

- `README.md` à la racine du projet :
  - Description du projet
  - Prérequis (Node.js, PostgreSQL, Redis si utilisé)
  - Instructions d'installation et de lancement
  - Variables d'environnement nécessaires (avec `.env.example`)
  - Commandes disponibles (`dev`, `build`, `test`, `seed`, `migrate`)
  - Architecture des dossiers

#### Changelog

- Un fichier `CHANGELOG.md` mis à jour à chaque phase complétée
- Format : date, phase, liste des fonctionnalités ajoutées

---

### UX & Onboarding

Une bonne UX d'onboarding réduit les frictions et rend la plateforme immédiatement utilisable.

#### Wizard de première installation

- Au premier lancement (aucun admin en base), afficher un wizard de configuration :
  1. Création du compte administrateur
  2. Configuration générale (nom de la plateforme, URL, email d'envoi)
  3. Configuration du premier plugin (optionnel, skippable)
  4. Création du premier produit (optionnel, skippable)
- Le wizard ne s'affiche qu'une seule fois, un flag `isSetupComplete` en base empêche de le relancer

#### États vides (empty states)

- Chaque page qui liste des éléments (clients, services, factures, plugins) doit avoir un état vide soigné :
  - Illustration ou icône sobre
  - Texte explicatif ("Aucun service pour le moment")
  - Call-to-action clair ("Créer votre premier service" avec lien vers la bonne page)
- Côté client : si aucun service, guider vers le catalogue ou inviter à contacter l'admin

#### Feedback utilisateur

- Toasts de confirmation pour chaque action (création, modification, suppression)
- Indicateurs de chargement (skeleton loaders) sur les pages qui fetchent des données
- Messages d'erreur clairs et actionnables (pas de "Une erreur est survenue", mais "Impossible de contacter le serveur Proxmox — vérifiez la configuration du plugin")

#### Aide contextuelle

- Tooltips ou petits textes d'aide sur les champs complexes (ex: "Egg ID Pelican : identifiant du type de serveur dans votre panel Pelican")
- Lien vers la documentation interne depuis les pages de configuration des plugins

---

### Infrastructure & Déploiement

Le projet doit être reproductible et déployable facilement, autant en développement qu'en production.

#### Docker Compose

- Un fichier `docker-compose.yml` à la racine qui orchestre :
  - L'application Next.js (build multi-stage pour la production)
  - PostgreSQL
  - Redis (si BullMQ est utilisé pour les jobs)
- Un `docker-compose.dev.yml` pour le développement avec hot-reload et volumes montés
- Un `Dockerfile` optimisé :
  - Stage 1 : installation des dépendances
  - Stage 2 : build Next.js
  - Stage 3 : image de production légère (node:alpine)

#### Variables d'environnement

- Fichier `.env.example` versionné avec toutes les variables nécessaires et des commentaires :
  ```env
  # Base de données
  DATABASE_URL=postgresql://user:password@localhost:5432/hosting_panel
  
  # Auth
  NEXTAUTH_SECRET=changeme
  NEXTAUTH_URL=http://localhost:3000
  
  # Chiffrement des secrets en base
  ENCRYPTION_KEY=changeme-32-chars-minimum
  
  # Stripe
  STRIPE_PUBLISHABLE_KEY=
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  
  # Email (SMTP)
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM=noreply@example.com
  
  # Redis (si BullMQ)
  REDIS_URL=redis://localhost:6379
  
  # Mode mock pour les tests
  USE_MOCKS=false
  ```

#### Seed de base de données

- Un script `prisma/seed.ts` qui crée :
  - Un compte admin par défaut (email + mot de passe à changer au premier login)
  - Quelques clients de test
  - Des services de démonstration dans différents états
  - Des données de facturation fictives (pour les phases 5-6)
- Exécutable via `npx prisma db seed`

#### Scripts NPM

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "next lint",
  "docker:dev": "docker compose -f docker-compose.dev.yml up",
  "docker:prod": "docker compose up -d --build"
}
```

#### Environnements

- **Développement** : `docker-compose.dev.yml` ou lancement local avec `npm run dev`
- **Production** : `docker-compose.yml` avec build optimisé, variables d'environnement injectées, reverse proxy (Traefik ou Nginx) devant l'app

---

### Système d'emails

Les emails sont utilisés dans plusieurs phases (reset password, alertes monitoring, rappels de facturation). Une brique transversale dédiée est indispensable.

#### Stack email

- **Envoi** : Nodemailer avec configuration SMTP (compatible avec n'importe quel provider : OVH, Gmail, Mailgun, Resend…)
- **Templates** : React Email pour créer des templates d'emails en JSX, compilés en HTML compatible avec tous les clients mail
- **Queue d'envoi** : tous les emails passent par le système de jobs asynchrones (BullMQ / pg-boss) pour éviter de bloquer les requêtes API et gérer les retries en cas d'échec SMTP

#### Templates à prévoir

Par phase :

- **Phase 1** : email de bienvenue à l'inscription, email de réinitialisation de mot de passe, email de confirmation d'activation du 2FA
- **Phase 4** : notification de provisionnement réussi, notification d'échec de provisionnement
- **Phase 5** : alerte service down (admin), alerte service down (client), notification de résolution d'incident
- **Phase 6** : facture générée, rappel avant échéance, rappel d'impayé, confirmation de paiement, notification de suspension imminente, notification de suspension effective, notification de réactivation

#### Structure technique

- Dossier `emails/` à la racine contenant tous les templates React Email
- Un service centralisé `lib/email.ts` qui expose une fonction `sendEmail(to, template, data)` et gère l'envoi via la queue
- Variables d'environnement SMTP dans le `.env`
- En mode développement, les emails sont loggés en console (pas d'envoi réel) ou envoyés vers un service de preview comme Mailpit

#### Bonnes pratiques

- Tous les emails contiennent le nom de la plateforme (ZoutaCMS ou le nom configuré par l'admin)
- Footer avec lien de désinscription pour les emails non-transactionnels
- Les emails transactionnels (reset password, confirmation paiement) ne sont pas désactivables
- Rate limiting sur l'envoi d'emails pour éviter le spam (max 3 reset password par heure par compte)

---

### Conventions de pagination & Performance

Avec la croissance des données (clients, services, health checks, factures, logs), les requêtes non paginées deviennent un problème de performance. Les conventions doivent être posées dès la phase 2.

#### Pagination côté API

- **Type** : pagination par curseur (cursor-based) pour les listes longues et en temps réel (health checks, logs), pagination par offset pour les listes admin classiques (clients, services, factures)
- **Paramètres standardisés** :
  ```
  GET /api/admin/clients?page=1&limit=20&search=john&sort=createdAt&order=desc
  GET /api/monitoring/healthchecks?cursor=abc123&limit=50
  ```
- **Réponse paginée standardisée** :
  ```json
  {
    "success": true,
    "data": [ ... ],
    "pagination": {
      "total": 342,
      "page": 1,
      "limit": 20,
      "totalPages": 18,
      "hasNext": true,
      "hasPrev": false
    }
  }
  ```
- **Taille de page par défaut** : 20 éléments, maximum 100

#### Performance base de données

- Index Prisma sur les colonnes fréquemment filtrées : `userId`, `status`, `type`, `createdAt`, `serviceId`
- Les requêtes de comptage (KPIs du dashboard) utilisent des `count()` Prisma optimisés, pas de `findMany().length`
- Pour les health checks et les logs (tables qui grossissent vite) : stratégie de rétention avec purge automatique des données anciennes (configurable, par défaut 90 jours pour les health checks, 1 an pour les logs)

#### Performance frontend

- Les listes utilisent la pagination côté serveur, jamais de chargement complet en mémoire
- Skeleton loaders pendant le chargement des données
- Debounce sur les champs de recherche (300ms)
- Les graphiques Recharts sont limités aux X derniers points de données (pas de rendu de 10 000 points)

---

### Préparation multi-tenant

ZoutaCMS est mono-tenant pour le MVP, mais l'architecture doit permettre une évolution multi-tenant sans refactoring majeur.

#### Principes de conception

- **Colonne `tenantId` optionnelle** : ajouter un champ `tenantId` (nullable) sur les modèles principaux (User, Service, Product, Invoice, ProviderConfig). Pour le MVP, ce champ reste `null` et est ignoré. En mode multi-tenant, il sera utilisé pour isoler les données.
- **Middleware Prisma** : préparer un middleware qui, en mode multi-tenant, injecte automatiquement le filtre `tenantId` sur toutes les requêtes. Pour le MVP, ce middleware est désactivé.
- **Configuration par tenant** : le modèle de configuration globale (nom de la plateforme, SMTP, Stripe) doit être structuré pour supporter un override par tenant à terme.
- **Ne PAS implémenter** pour le MVP : gestion des tenants, isolation des données, onboarding tenant, facturation inter-tenants. Simplement poser les `tenantId` et la structure pour que ce soit faisable plus tard.

---

## Notes techniques générales

- **TypeScript strict** : tout le projet en TypeScript avec le mode strict activé
- **API Routes** : utilisation des Route Handlers Next.js (`app/api/`), réponses JSON standardisées
- **Prisma** : migrations versionnées, seeds pour les données de test
- **Git** : un commit par fonctionnalité, branches par phase, tags de version à chaque phase complétée
