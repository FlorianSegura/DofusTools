-- Table pour stocker les items du jeu Dofus
-- Cette table est publique et accessible en lecture par tous les utilisateurs authentifiés
-- Chaque item contient les données XP et prix qui peuvent être modifiés

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY, -- ID Ankama de l'item
  xp DECIMAL(10, 2) DEFAULT 0.0,
  prix_1u INTEGER,
  prix_10u INTEGER,
  prix_100u INTEGER,
  prix_1000u INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_items_id ON items(id);

-- RLS (Row Level Security) - Tous les utilisateurs authentifiés peuvent lire et modifier
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent voir toutes les données
CREATE POLICY "Authenticated users can view all items"
  ON items FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Tous les utilisateurs authentifiés peuvent modifier les données
CREATE POLICY "Authenticated users can update items"
  ON items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Tous les utilisateurs authentifiés peuvent insérer des données
CREATE POLICY "Authenticated users can insert items"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Tous les utilisateurs authentifiés peuvent supprimer des données
CREATE POLICY "Authenticated users can delete items"
  ON items FOR DELETE
  TO authenticated
  USING (true);
