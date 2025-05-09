// frontend/pages/index.tsx
import { useState } from 'react';
import Head from 'next/head';
import { ArrowRight, Check } from 'lucide-react';
import { NextPage } from 'next';
import {User} from '@/types/user';
import { useAuth } from '@/provider/auth';
import Layout from '@/components/layout/layout';


const Home: NextPage = () => {
  const { user } = useAuth() as { user: User | null };

  return (
    <Layout>
      <Head>
        <title>RecruteIA - Solution d'entretien propulsée par l'IA</title>
        <meta name="description" content="RecruteIA - Solution d'entretien propulsée par l'IA pour les professionnels du recrutement" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Section Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-700 text-black py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Transformez votre processus de recrutement avec l'IA
            </h1>
            <p className="text-xl mb-8">
              RecruteIA automatise les entretiens techniques, analyse les CV et aide vos recruteurs à prendre de meilleures décisions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {user ? (
                <a href="/interviews/new" 
                className="bg-white text-primary-700 font-bold py-3 px-6 rounded-lg 
                hover:bg-primary-50 transition duration-300">
                  Démarrer un entretien
                </a>
              ) : (
                <a href="/auth/register" className="bg-white text-primary-700 font-bold py-3 px-6 rounded-lg 
                hover:bg-primary-50 transition duration-300">
                  Commencer gratuitement
                </a>
              )}
              <a href="#fonctionnalites" className="bg-transparent border-2 border-white text-black font-bold py-3 px-6 rounded-lg hover:bg-white/10 transition duration-300">
                Découvrir les fonctionnalités
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* Section Fonctionnalités */}
      <section id="fonctionnalites" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités principales</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Entretiens IA</h3>
              <p className="text-gray-600">Menez des entretiens techniques automatisés qui s'adaptent au profil du candidat.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyse de CV</h3>
              <p className="text-gray-600">Extrayez automatiquement les compétences et l'expérience pour évaluer l'adéquation au poste.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Mode collaboratif</h3>
              <p className="text-gray-600">Assistez vos recruteurs avec des suggestions de questions et des évaluations en temps réel.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyses et rapports</h3>
              <p className="text-gray-600">Obtenez des insights détaillés sur les performances des candidats et optimisez votre processus.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Section de Produits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Nos Solutions</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 bg-primary-50">
                <h3 className="text-xl font-bold mb-2 text-primary-700">Recruteur Solo</h3>
                <p className="text-gray-600 mb-4">Idéal pour les recruteurs indépendants</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">49€</span>
                  <span className="text-gray-500 ml-1">/mois</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>10 entretiens par mois</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Analyse de CV (jusqu'à 30)</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Rapports basiques</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Email support</span>
                  </li>
                </ul>
                <button className="w-full mt-6 bg-primary-600 text-black py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition">
                  Choisir ce plan
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-primary-500 rounded-lg shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 bg-primary-500 text-black text-xs font-bold px-3 py-1 rounded-bl">
                POPULAIRE
              </div>
              <div className="p-6 bg-primary-100">
                <h3 className="text-xl font-bold mb-2 text-primary-700">Équipe</h3>
                <p className="text-gray-600 mb-4">Pour les équipes RH de petites et moyennes entreprises</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">129€</span>
                  <span className="text-gray-500 ml-1">/mois</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>50 entretiens par mois</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Analyse de CV illimitée</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Rapports avancés et comparatifs</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Support prioritaire</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>3 utilisateurs inclus</span>
                  </li>
                </ul>
                <button className="w-full mt-6 bg-primary-600 text-black py-2 px-4 rounded-lg font-medium hover:bg-primary-700 transition">
                  Choisir ce plan
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 bg-primary-50">
                <h3 className="text-xl font-bold mb-2 text-primary-700">Enterprise</h3>
                <p className="text-gray-600 mb-4">Pour les grandes organisations avec des besoins spécifiques</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">Sur mesure</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Entretiens illimités</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Intégration ATS/SIRH</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>API complète</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Analyse biométrique avancée</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Fonctionnalités personnalisées</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Gestionnaire de compte dédié</span>
                  </li>
                </ul>
                <button className="w-full mt-6 bg-white border border-primary-600 text-primary-600 py-2 px-4 rounded-lg font-medium hover:bg-primary-50 transition">
                  Contacter les ventes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Section prix */}
      <section id="prix" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Tarification transparente</h2>
          <p className="text-xl text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            Choisissez le plan qui correspond à vos besoins. Tous nos plans incluent une période d'essai gratuite de 14 jours.
          </p>

          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-2">Frais d'abonnement</h3>
                <p className="text-gray-600">À partir de 49€/mois selon le plan choisi</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-2">Entretiens supplémentaires</h3>
                <p className="text-gray-600">5€ par entretien au-delà du quota mensuel</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-2">Utilisateurs supplémentaires</h3>
                <p className="text-gray-600">25€/mois par utilisateur supplémentaire</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/pricing"
              className="text-primary-600 font-medium hover:text-primary-700 flex items-center justify-center"
              >
              Voir tous les détails de tarification
              <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      {/* Section CTA */}
      <section className="py-16 bg-primary-700 text-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Prêt à transformer votre processus de recrutement ?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Rejoignez les entreprises innovantes qui utilisent RecruteIA pour trouver les meilleurs talents plus rapidement et plus efficacement.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/auth/register" className="bg-white text-primary-700 font-bold py-3 px-8 rounded-lg hover:bg-primary-50 transition duration-300">
              Commencer gratuitement
            </a>
            <a href="/auth/login" className="bg-transparent border-2 border-white text-black font-bold py-3 px-8 rounded-lg hover:bg-white/10 transition duration-300">
              Se connecter
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;