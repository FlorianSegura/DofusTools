1) **Erreur persistante** Xp items --> Je ne vois toujours plus mes quelques items que j'ai chargé, comme s'il n'y avait pas de sauvegarde dans le local storage.
Je redéfinie ma spécification : 
- dans l'onglet "Xp item", je cherche un item puis je le sélectionne. Il s'affiche dans mon tableau.
- je peux modifier cet item à mon souhait
- je change d'onglet, ou je me déconnecte, ou je change de PC, j'aimerais que lorsque je revienne sur cette onglet, je retrouve mes items sélectionnés. Il faudrait certainement avoir une table dans la base de données qui sauvegarde la sélection pour chaque utilisateur connecté. 
Dans cette table, il faudrait stocker la liste des ID des items, et des utilisateurs. Lorque l'onglet doit s'afficher, on relit les items, on refait le lien avec dofusdude.