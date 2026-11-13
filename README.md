# Mes congés

Suivi personnel de congés (CA, sick leave, absences « Autre », jours fériés). Next.js + Google Sheets, hébergé sur Vercel.

- Connexion : Google, limitée à une seule adresse (`ALLOWED_EMAIL`).
- Données : un Google Sheet, trois onglets créés automatiquement (`Saisies`, `Feries`, `Quotas`). Tu peux les lire et les corriger à la main.
- Règles : lundi–vendredi, demi-journées, férié sous une absence ignoré avec alerte, report de CA plafonné à 5, quotas par année, début au 01/01/2026.

## Lancer en local sans Google

```bash
npm install
DEV_LOCAL=1 npm run dev
```

Les données sont alors stockées dans `.data/db.json`. Ce mode est désactivé en production.

Tests des règles de calcul :

```bash
npm test
```

## Mise en ligne, pas à pas

### 1. Créer le repo GitHub

1. Sur github.com, clique sur **New repository**. Nom : `mes-conges`. Visibilité : **Private**. Ne coche aucune option d'initialisation (pas de README, pas de .gitignore).
2. Dans le dossier du projet, sur ta machine :

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/mes-conges.git
git push -u origin main
```

### 2. Projet Google Cloud et compte de service

1. Va sur console.cloud.google.com, crée un projet (ex. `mes-conges`).
2. **APIs et services > Bibliothèque** : active **Google Sheets API**.
3. **IAM et administration > Comptes de service > Créer un compte de service** (nom : `mes-conges-sheets`). Aucun rôle à attribuer.
4. Ouvre le compte créé, onglet **Clés > Ajouter une clé > Créer une clé > JSON**. Un fichier se télécharge.
5. Dans ce fichier JSON, note `client_email` (devient `GOOGLE_SERVICE_ACCOUNT_EMAIL`) et `private_key` (devient `GOOGLE_PRIVATE_KEY`). Ne le commite jamais.

### 3. Créer le Google Sheet

1. Crée un Google Sheet vide, nommé par exemple « Mes congés ».
2. Clique sur **Partager**, ajoute l'adresse `client_email` du compte de service avec le rôle **Éditeur**.
3. L'identifiant du Sheet est dans son URL : `https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit`.

### 4. Connexion Google (OAuth)

1. Console Google Cloud > **APIs et services > Écran de consentement OAuth**. Type d'utilisateur : **Externe**. Renseigne le nom de l'app et ton adresse. Laisse le statut **En test**.
2. Section **Utilisateurs test** : ajoute ton adresse Gmail.
3. **Identifiants > Créer des identifiants > ID client OAuth**, type **Application Web**.
4. **URI de redirection autorisés**, à ajouter :
   - `http://localhost:3000/api/auth/callback/google`
   - `https://TON-DOMAINE.vercel.app/api/auth/callback/google` (à compléter après l'étape 5)
5. Note l'ID client (`AUTH_GOOGLE_ID`) et le code secret (`AUTH_GOOGLE_SECRET`).

### 5. Déployer sur Vercel

1. Sur vercel.com, **Add New > Project**, connecte GitHub et importe `mes-conges`.
2. Avant de déployer, ajoute les variables d'environnement de `.env.example` : `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `ALLOWED_EMAIL`, `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`.
   - `GOOGLE_PRIVATE_KEY` : colle la clé telle quelle, avec les `\n` littéraux du JSON.
   - Ne mets pas `DEV_LOCAL`.
3. Clique sur **Deploy**. Vercel te donne l'URL `https://xxx.vercel.app`.
4. Retourne à l'étape 4.4 et ajoute l'URI de redirection avec cette URL exacte. Attends quelques minutes, puis connecte-toi.

### Vérifications après le premier déploiement

- Connexion avec ton Gmail : OK. Avec un autre compte : refusée.
- Les onglets `Saisies`, `Feries` et `Quotas` apparaissent dans le Sheet après le premier chargement.
- Saisis les quotas de 2026 et les fériés dans **Quotas & fériés**.

## Structure

- `lib/compute.ts` : toutes les règles de calcul (testées dans `lib/compute.test.ts`).
- `lib/sheets.ts` : lecture et écriture Google Sheets. `lib/store.ts` : choix Sheets ou stockage local.
- `app/api/data/route.ts` : API protégée (session Google + adresse autorisée) avec validation des données.
- `components/` : interface.
