const fs = require('fs');
const path = require('path');

/**
 * Script pour convertir xp-ressources-by-id.json en CSV
 * Usage: node scripts/json-to-csv.js
 */

const inputPath = path.join(__dirname, '..', 'public', 'xp-ressources-by-id.json');
const outputPath = path.join(__dirname, '..', 'public', 'xp-ressources-by-id.csv');

try {
  // Lire le fichier JSON
  console.log('Lecture du fichier JSON...');
  const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // Vérifier la structure des données
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Format JSON invalide');
  }

  // Convertir l'objet en tableau si nécessaire
  let dataArray = Array.isArray(jsonData) ? jsonData : Object.entries(jsonData).map(([id, data]) => ({
    id,
    ...data
  }));

  if (dataArray.length === 0) {
    throw new Error('Aucune donnée à convertir');
  }

  // Extraire les en-têtes (colonnes) à partir du premier élément
  const headers = Object.keys(dataArray[0]);

  // Créer la ligne d'en-tête CSV
  const csvHeaders = headers.join(',');

  // Créer les lignes de données CSV
  const csvRows = dataArray.map(item => {
    return headers.map(header => {
      const value = item[header];

      // Gérer les valeurs null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Convertir en string et échapper les guillemets
      let stringValue = String(value);

      // Entourer de guillemets si la valeur contient une virgule, un guillemet ou un saut de ligne
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
      }

      return stringValue;
    }).join(',');
  });

  // Combiner les en-têtes et les lignes
  const csvContent = [csvHeaders, ...csvRows].join('\n');

  // Écrire le fichier CSV
  console.log('Écriture du fichier CSV...');
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  console.log(`✓ Conversion réussie!`);
  console.log(`  - Fichier source: ${inputPath}`);
  console.log(`  - Fichier CSV: ${outputPath}`);
  console.log(`  - Nombre de lignes: ${dataArray.length}`);
  console.log(`  - Colonnes: ${headers.join(', ')}`);

} catch (error) {
  console.error('Erreur lors de la conversion:', error.message);

  if (error.code === 'ENOENT') {
    console.error(`\nLe fichier ${inputPath} n'existe pas.`);
    console.error('Veuillez créer le fichier JSON avant de lancer ce script.');
  }

  process.exit(1);
}
