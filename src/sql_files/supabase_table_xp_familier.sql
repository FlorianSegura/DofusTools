-- Table pour stocker les données d'expérience des familiers
-- Cette table est publique et accessible en lecture par tous les utilisateurs authentifiés

CREATE TABLE IF NOT EXISTS xp_familier (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL,
  xp_required BIGINT NOT NULL,
  xp_total BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes par niveau
CREATE INDEX IF NOT EXISTS idx_xp_familier_level ON xp_familier(level);

-- RLS (Row Level Security) - Tous les utilisateurs authentifiés peuvent lire
ALTER TABLE xp_familier ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent voir toutes les données
CREATE POLICY "Authenticated users can view all xp_familier data"
  ON xp_familier FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Tous les utilisateurs authentifiés peuvent modifier les données
-- (utile pour permettre les modifications via l'interface)
CREATE POLICY "Authenticated users can update xp_familier data"
  ON xp_familier FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Tous les utilisateurs authentifiés peuvent insérer des données
CREATE POLICY "Authenticated users can insert xp_familier data"
  ON xp_familier FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Tous les utilisateurs authentifiés peuvent supprimer des données
CREATE POLICY "Authenticated users can delete xp_familier data"
  ON xp_familier FOR DELETE
  TO authenticated
  USING (true);
