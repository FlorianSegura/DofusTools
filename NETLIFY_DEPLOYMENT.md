# Configuration du déploiement Netlify

## Problème de redirection OAuth

Après l'authentification Google sur Netlify, l'utilisateur est redirigé vers `localhost:3000` au lieu de l'URL de production `https://dofustools.netlify.app/`.

## Solution

### 1. Configuration des variables d'environnement sur Netlify

Allez dans votre projet Netlify : **Site settings** > **Environment variables**

Ajoutez la variable suivante :

```
NEXT_PUBLIC_SITE_URL=https://dofustools.netlify.app
```

### 2. Configuration Supabase

Allez dans votre projet Supabase : **Authentication** > **URL Configuration**

Ajoutez l'URL de votre site Netlify dans **Site URL** :

```
https://dofustools.netlify.app
```

Ajoutez également dans **Redirect URLs** :

```
https://dofustools.netlify.app/**
https://dofustools.netlify.app/auth/callback
```

### 3. Redéploiement

Après avoir configuré les variables d'environnement, redéployez votre site sur Netlify pour que les changements prennent effet.

## Note importante

- N'oubliez pas de garder `http://localhost:3000` dans les Redirect URLs de Supabase pour le développement local
- Les variables d'environnement de Netlify sont distinctes de votre fichier `.env` local
