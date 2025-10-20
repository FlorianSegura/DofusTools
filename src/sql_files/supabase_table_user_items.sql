-- Table pour stocker les items sélectionnés par chaque utilisateur
-- Cette table fait le lien entre les utilisateurs et les items qu'ils ont ajoutés dans l'onglet "Xp item"

CREATE TABLE IF NOT EXISTS user_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON user_items(item_id);

-- RLS (Row Level Security) - Les utilisateurs ne peuvent voir que leurs propres items
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres items
CREATE POLICY "Users can view their own items"
  ON user_items FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent insérer leurs propres items
CREATE POLICY "Users can insert their own items"
  ON user_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres items
CREATE POLICY "Users can delete their own items"
  ON user_items FOR DELETE
  USING (auth.uid() = user_id);
