# Configuration Supabase - DofusTools

## Structure de la base de données

Le projet utilise 3 tables principales dans Supabase:

### 1. `xp_familier` - Table publique de référence
Table contenant les données d'expérience des familiers par niveau (lecture/écriture pour tous les utilisateurs authentifiés).

**Fichier SQL**: `supabase_table_xp_familier.sql`

**Structure**:
- `id` (SERIAL PRIMARY KEY)
- `level` (INTEGER) - Niveau du familier
- `xp_required` (BIGINT) - XP requise pour ce niveau
- `xp_total` (BIGINT) - XP totale cumulée
- `created_at` (TIMESTAMP)

**RLS activé**: ✅ Tous les utilisateurs authentifiés peuvent lire et modifier

---

### 2. `items` - Table publique de référence
Table contenant les items du jeu avec leurs prix et XP (lecture/écriture pour tous les utilisateurs authentifiés).

**Fichier SQL**: `supabase_table_items.sql`

**Structure**:
- `id` (INTEGER PRIMARY KEY) - ID Ankama de l'item
- `xp` (DECIMAL) - Points d'expérience de l'item
- `prix_1u` (INTEGER) - Prix pour 1 unité
- `prix_10u` (INTEGER) - Prix pour 10 unités
- `prix_100u` (INTEGER) - Prix pour 100 unités
- `prix_1000u` (INTEGER) - Prix pour 1000 unités
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**RLS activé**: ✅ Tous les utilisateurs authentifiés peuvent lire et modifier

---

### 3. `user_items` - Table spécifique par utilisateur
Table de jonction reliant les utilisateurs à leurs items sélectionnés (chaque utilisateur voit uniquement ses propres sélections).

**Fichier SQL**: `supabase_table_user_items.sql`

**Structure**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (UUID) - Référence à auth.users(id)
- `item_id` (INTEGER) - Référence à items(id)
- `created_at` (TIMESTAMP)
- Contrainte UNIQUE sur (user_id, item_id)

**RLS activé**: ✅ Chaque utilisateur ne voit que ses propres items (filtré par `auth.uid()`)

---

## Installation des tables

Pour configurer votre base de données Supabase:

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez les fichiers SQL dans cet ordre:

```sql
-- 1. Créer la table items
-- Copier/coller le contenu de supabase_table_items.sql

-- 2. Créer la table xp_familier
-- Copier/coller le contenu de supabase_table_xp_familier.sql

-- 3. Créer la table user_items
-- Copier/coller le contenu de supabase_table_user_items.sql
```

---

## Pourquoi RLS est activé différemment ?

### Tables publiques (`items` et `xp_familier`)
Ces tables sont des **données de référence** partagées par tous les utilisateurs:
- Politiques RLS: `TO authenticated USING (true)`
- Tous les utilisateurs authentifiés peuvent lire et modifier
- Les modifications sont visibles par tous

### Table privée (`user_items`)
Cette table contient des **données spécifiques par utilisateur**:
- Politiques RLS: `USING (auth.uid() = user_id)`
- Chaque utilisateur ne voit que ses propres enregistrements
- Isolation complète des données entre utilisateurs

---

## Problème courant: RLS activé sans politiques

**Symptôme**: Quand vous activez RLS sur `xp_familier`, aucune donnée ne s'affiche.

**Cause**: Supabase bloque TOUT accès par défaut quand RLS est activé sans politiques.

**Solution**: Créer les politiques avec `TO authenticated USING (true)` pour permettre l'accès aux utilisateurs authentifiés.

---

## Vérification

Pour vérifier que les politiques sont correctement configurées:

1. Allez dans **Authentication** > **Policies**
2. Pour chaque table, vous devriez voir:
   - `xp_familier`: 4 politiques (SELECT, UPDATE, INSERT, DELETE) pour `authenticated`
   - `items`: 4 politiques (SELECT, UPDATE, INSERT, DELETE) pour `authenticated`
   - `user_items`: 3 politiques (SELECT, INSERT, DELETE) filtrées par `user_id`

3. Testez en vous connectant avec différents comptes utilisateurs
