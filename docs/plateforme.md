# Plateforme Liana

## Vue d'ensemble

Liana est une plateforme d'invitation de mariage premium qui combine un site événementiel privé et un espace d'administration complet. Elle permet de présenter l'univers du mariage côté invités, tout en centralisant côté organisateurs les réponses, la logistique et le suivi opérationnel.

Le projet ne se limite pas à une simple landing page de mariage. C'est un produit plus large pensé comme un mini système de gestion d'événement, avec une expérience soignée pour les invités et des outils métier concrets pour les mariés ou leur équipe.

## Ce que fait la plateforme

La plateforme repose sur deux espaces complémentaires :

### 1. L'espace invité

Cet espace sert de site privé du mariage. Il permet de :

- présenter le couple, la date et les lieux de l'événement ;
- partager les informations importantes du jour J ;
- afficher le programme, l'hébergement et les contenus éditoriaux ;
- collecter les confirmations de présence via un formulaire RSVP ;
- récupérer les contraintes logistiques des invités ;
- proposer un espace profil pour consulter ou mettre à jour certaines informations.

L'accès public est protégé par un mot de passe d'entrée, puis certaines zones utilisent une authentification plus poussée. L'idée est de garder un site élégant, simple à utiliser, mais réservé aux bonnes personnes.

### 2. L'espace administration

L'admin transforme le site en véritable outil de pilotage. Il permet de gérer :

- le suivi global des RSVP ;
- les accompagnants et le nombre réel de participants ;
- les régimes alimentaires et besoins spécifiques ;
- le plan de table et l'organisation des tables ;
- les menus et exports liés au repas ;
- la playlist ;
- l'agenda et les temps forts ;
- les emails envoyés aux invités ;
- le blog ou les actualités privées ;
- le budget et le suivi financier ;
- un wedding planner avec tâches manuelles et suggestions générées par IA.

L'interface admin est pensée comme un tableau de bord central. Chaque module répond à un besoin opérationnel concret avant et pendant l'événement.

## Valeur du produit

La valeur de Liana est de réunir dans une seule plateforme ce qui est souvent dispersé entre plusieurs outils :

- un site d'invitation élégant ;
- un formulaire RSVP structuré ;
- un suivi invités ;
- un back-office logistique ;
- des outils de communication ;
- un accompagnement à l'organisation.

Autrement dit, la plateforme aide à passer d'une invitation statique à une gestion de mariage réellement pilotable.

## Fonctionnalités clés

### Gestion des RSVP

Le formulaire RSVP va au-delà d'une simple réponse oui/non. Il collecte notamment :

- la présence ;
- les parties du mariage auxquelles l'invité participe ;
- les besoins de transport ;
- les régimes alimentaires ;
- les informations des accompagnants ;
- un message personnalisé.

Ces données alimentent ensuite automatiquement l'administration.

### Gestion des invités et de la logistique

La plateforme sert de base centrale pour organiser l'événement :

- comptage précis des présents ;
- suivi des réponses ;
- préparation des menus ;
- aide à la composition des tables ;
- visualisation des données dans le dashboard admin.

### Communication avec les invités

Liana inclut des fonctions de communication, avec notamment :

- un blog privé pour partager des nouvelles ;
- un module d'envoi d'emails ;
- un historique des campagnes ;
- la possibilité de cibler certains groupes de destinataires.

### Pilotage interne

Côté organisation, la plateforme aide aussi à garder une vision claire :

- budget ;
- agenda ;
- playlist ;
- tâches de préparation ;
- rôles et permissions d'accès ;
- espace superadmin pour les droits avancés.

## Public visé

La plateforme s'adresse à deux niveaux :

- les invités, qui accèdent à une expérience claire, belle et simple ;
- les organisateurs, qui disposent d'un outil central pour gérer l'événement sans multiplier les tableurs et messages.

Dans une logique produit, Liana peut être vue comme une solution de mariage sur mesure, à mi-chemin entre le site événementiel haut de gamme et l'outil de gestion opérationnelle.

## Architecture du projet

Le projet est structuré en deux parties principales :

- un frontend en Vue 3 + Vite, qui gère l'interface publique et l'admin ;
- un backend Node.js avec Hono, qui expose les routes API métier.

Le projet s'appuie aussi sur Firebase pour l'authentification et le stockage des données, avec un système de rôles et permissions pour sécuriser l'accès aux modules sensibles.

## Résumé en une phrase

Liana est une plateforme de mariage qui combine site privé invités, collecte RSVP et back-office d'organisation pour centraliser toute la gestion de l'événement dans une seule expérience.
