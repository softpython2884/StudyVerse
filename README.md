# StudyVerse - Environnement d'Apprentissage Augmenté par l'IA

StudyVerse est une application web conçue pour aider les étudiants et les apprenants à créer, organiser et enrichir leurs notes de cours grâce à une suite d'outils basés sur l'intelligence artificielle.

**Créé par Night sur Nightforge : [forgenet.Fr](https://forgenet.fr)**

---

## ▶️ But du Projet

L'objectif de StudyVerse est de transformer la prise de notes traditionnelle en une expérience d'apprentissage dynamique et interactive. L'application intègre l'IA pour automatiser les tâches fastidieuses et pour visualiser des concepts complexes, permettant ainsi aux utilisateurs de se concentrer sur la compréhension et la mémorisation.

## ✨ Fonctionnalités Principales

- **Prise de Notes Intelligente** : Un éditeur de texte riche pour créer et formater des notes.
- **Organisation Structurée** : Organisez vos notes en `Classeurs` > `Carnets` > `Pages` pour une navigation intuitive.
- **Transcription Vocale en Temps Réel** : Dictez vos notes et laissez l'IA les transcrire instantanément.
- **Assistant IA Intégré** :
  - **Correction** orthographique et grammaticale.
  - **Raffinement** : Structurez et clarifiez automatiquement vos brouillons.
  - **Traduction** dans plusieurs langues.
  - **Génération de Diagrammes** : Créez des cartes mentales (`MindMap`), des organigrammes et plus encore à partir d'une simple description.
- **Partage et Collaboration** : Partagez des pages, des carnets ou même des classeurs entiers avec d'autres utilisateurs, avec des permissions de lecture ou d'édition.

## 🛠️ Stack Technique

- **Framework Frontend** : [Next.js](https://nextjs.org/) (avec App Router)
- **Librairie UI** : [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) & [ShadCN/UI](https://ui.shadcn.com/)
- **Intelligence Artificielle** : [Google Genkit](https://firebase.google.com/docs/genkit)
- **Base de Données** : [SQLite](https://www.sqlite.org/index.html)

## ⚙️ Installation et Démarrage

Suivez ces étapes pour lancer le projet en local.

### 1. Installation des dépendances

Assurez-vous d'avoir [Node.js](https://nodejs.org/) (version 18 ou supérieure) installé. Ensuite, ouvrez un terminal à la racine du projet et exécutez :

```bash
npm install
```

### 2. Configuration de l'environnement

Ce projet utilise Genkit pour ses fonctionnalités d'IA, qui nécessite une clé API pour les modèles Google.

- Créez un fichier `.env` à la racine du projet.
- Ajoutez-y votre clé API comme ceci :

```env
GEMINI_API_KEY=VOTRE_CLE_API_ICI
```

### 3. Démarrage du serveur de développement

Pour lancer l'application en mode développement, utilisez la commande suivante :

```bash
npm run dev
```

L'application sera accessible à l'adresse [http://localhost:9002](http://localhost:9002).
