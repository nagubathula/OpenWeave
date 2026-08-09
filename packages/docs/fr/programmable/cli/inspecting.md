---
title: Inspecter des fichiers
description: Parcourez les arborescences de nœuds, recherchez par nom ou type, et examinez les propriétés depuis le terminal.
---

# Inspecter des fichiers

Le CLI vous permet d'explorer des fichiers `.fig` sans ouvrir l'éditeur. Chaque commande fonctionne aussi sur l'application en cours d'exécution — il suffit d'omettre l'argument fichier.

::: tip Installation
```sh
npm install -g @openweave/cli
# ou
brew install openweave/tap/openweave
```
:::

## Informations sur le document

Obtenez un aperçu rapide — nombre de pages, nombre total de nœuds, polices utilisées, taille du fichier :

```sh
openweave info design.fig
```

## Arborescence des nœuds

Affichez la hiérarchie complète des nœuds :

```sh
openweave tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Trouver des nœuds

Rechercher par type :

```sh
openweave find design.fig --type TEXT
```

Rechercher par nom :

```sh
openweave find design.fig --name "Button"
```

Les deux options peuvent être combinées pour affiner les résultats.

## Détails d'un nœud

Inspectez toutes les propriétés d'un nœud spécifique par son identifiant :

```sh
openweave node design.fig --id 1:23
```

## Pages

Listez toutes les pages du document :

```sh
openweave pages design.fig
```

## Variables

Listez les variables de design et leurs collections :

```sh
openweave variables design.fig
```

## Mode application en direct

Quand l'application de bureau est en cours d'exécution, omettez l'argument fichier — le CLI se connecte via RPC et opère sur le canevas en direct :

```sh
openweave tree              # inspecter le document en direct
openweave eval -c "..."     # interroger l'éditeur
```

## Sortie JSON

Toutes les commandes supportent `--json` pour une sortie lisible par machine — redirigez vers `jq`, alimentez des scripts CI, ou traitez avec d'autres outils :

```sh
openweave tree design.fig --json | jq '.[] | .name'
```
