J'ai branché Entreprises2.csv dans le pipeline existant en suivant la même structure que la source 1.
J'ai créé ingest-source2.ts pour ingérer employees et website en ignorant Tranche effectifs. 
J'ai ajouté un booléen hasWebsite calculé au refresh plutôt qu'à la requête pour que le filtre soit indexable. Les nouveaux filtres sont exposés dans l'API et branchés dans l'UI.
Au passage j'ai corrigé un bug dans le package.json, les scripts utilisaient node pour exécuter des .ts, j'ai installé tsx pour que ça marche.


Tests
cd backend
pnpm test

11 tests unitaires sur le parsing de ingest-source2 (lignes invalides, champs manquants, Tranche effectifs ignorée) et la logique de merge de refresh-company (les deux sources, une seule, aucune, calcul de hasWebsite).