# Guide de déploiement en production — FoodSupply Dakar

Ce guide couvre la mise en ligne propre et sécurisée de **FoodSupply** avec **GitHub + Vercel + TiDB Cloud + Vercel Blob + Resend**.

---

## 1. Pré-requis de sécurité obligatoires AVANT mise en ligne

1. **Changer le mot de passe TiDB Cloud**
   - Connectez-vous à votre console **TiDB Cloud** → *Cluster* → *Security / SQL Users*.
   - Régénérez un nouveau mot de passe fort pour votre utilisateur SQL et mettez-le uniquement dans les variables d'environnement Vercel (jamais dans Git).
2. **Changer le mot de passe Administrateur par défaut**
   - Dès la première connexion à `/connexion-admin` (`admin@foodsupply.sn`), utilisez la procédure de réinitialisation ou mettez à jour le mot de passe en base pour remplacer `FoodSupply2026!`.
3. **Générer un secret d'authentification unique**
   - Exécutez `openssl rand -base64 32` (ou générateur équivalent) pour `NEXTAUTH_SECRET`.

---

## 2. Déploiement GitHub → Vercel

1. Poussez votre dépôt `main` sur GitHub (vérifiez que `.env` et `storage/` sont bien ignorés dans `.gitignore`).
2. Sur **Vercel** : *Add New Project* → importez votre dépôt GitHub.
3. **Build & Output Settings** (valeurs par défaut Next.js) :
   - Build Command : `npm run build` (exécute automatiquement `prisma generate && next build`).
   - Install Command : `npm install`.

---

## 3. Variables d'environnement à configurer dans Vercel

Dans *Project Settings → Environment Variables* (Production) :

| Variable | Obligatoire | Exemple / Notes |
| --- | :---: | --- |
| `DATABASE_URL` | Oui | `mysql://<user>:<NEW_PASS>@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/foodsupply?sslaccept=strict` |
| `NEXTAUTH_SECRET` | Oui | Secret aléatoire 32+ octets Base64 |
| `NEXTAUTH_URL` | Oui | `https://foodsupply.sn` (ou votre URL `*.vercel.app`) |
| `AUTH_TRUST_HOST` | Oui | `true` |
| `NEXT_PUBLIC_APP_URL` | Oui | `https://foodsupply.sn` |
| `BLOB_READ_WRITE_TOKEN` | Recommandé | Créé via *Vercel → Storage → Create Blob Store* (si absent, les photos sont automatiquement persistées dans TiDB `StoredMedia` sans perte !) |
| `RESEND_API_KEY` | Recommandé | Clé API Resend pour envoyer les emails de réinitialisation mot de passe |
| `EMAIL_FROM` | Optionnel | `FoodSupply Dakar <contact@foodsupply.sn>` |
| `PAYMENT_WEBHOOK_SECRET` | Optionnel | Secret HMAC-SHA256 si passage ultérieur à Wave Business API |

> **Astuce TiDB Cloud + Vercel (Linux)** : Sur Linux (Vercel), le certificat racine ISRG Root X1 est déjà présent dans le système ; utilisez simplement `?sslaccept=strict` dans `DATABASE_URL` (sans `&sslcert=./isrgrootx1.pem`).

---

## 4. Configuration post-déploiement dans l'espace Admin

Connectez-vous sur `https://votre-domaine/connexion-admin` puis vérifiez :

1. **`/admin/parametres`** :
   - Vérifiez votre lien marchand Wave (`https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/`).
   - Activez éventuellement votre code marchand **Orange Money** secondaire.
   - Renseignez votre vrai **numéro WhatsApp support Dakar**, votre **NINEA** et votre **RC** pour les factures PDF.
2. **`/admin/frais-livraison`** :
   - Ajustez si besoin les tarifs de vos **4 zones de Dakar** et le seuil de livraison offerte.
3. **`/admin/produits`** :
   - Ajoutez vos premiers articles réels, leurs photos, prix clients FCFA et éventuels paliers de prix gros/demi-gros.

---

## 5. Checklist de vérification post-déploiement

- [ ] `GET /api/health` retourne `200 OK` avec base TiDB connectée.
- [ ] `GET /robots.txt` et `GET /sitemap.xml` répondent correctement (et bloquent `/admin`, `/fournisseur`, `/suivi/`).
- [ ] Tester 1 commande complète **sans compte** sur smartphone : ajout au panier → partage GPS → soumission → confirmation Admin → clic **Payer par Wave** (vérifier ouverture app Wave avec montant pré-rempli) → validation paiement Admin → téléchargement **Facture PDF** et **Bon de livraison PDF**.
- [ ] Tester l'installation **PWA** (« Ajouter à l'écran d'accueil ») sur Android / iPhone.
- [ ] Tester l'inscription libre d'un fournisseur sur `/devenir-fournisseur` et la soumission d'une proposition avec photo caméra.
