// frontend/pages/interviews/[id].jsx (mise à jour avec modes d'entretien IA)
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import axios from 'axios';

// Composants d'interface
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import IconButton from '../../components/ui/IconButton';
import Spinner from '../../components/ui/Spinner';

// Composants d'entretien
import InterviewController from '../../components/interview/InterviewController';
import VideoStream from '../../components/interview/VideoStream';
import EnhancedAudioRecorder from '../../components/interview/EnhancedAudioRecorder';
import BiometricDashboard from '../../components/interview/BiometricDashboard';
import Question from '../../components/interview/Question';
import ResponseInput from '../../components/interview/ResponseInput';
import EvaluationCard from '../../components/interview/EvaluationCard';
import AIContentsPanel from '../../components/interview/AIContentsPanel';
import RequestAIAnalysis from '../../components/interview/RequestAIAnalysis';
import AIAssistantChat from '../../components/interview/AIAssistantChat';
import SuggestedQuestions from '../../components/interview/SuggestedQuestions';

// Layout
import DashboardLayout from '../../components/layout/DashboardLayout';

// Hooks et utilitaires
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import AIAssistantService from '../../services/aiAssistantService';
import { BotIcon, UserPlus, MessageCircle, AlertCircle, Brain } from 'lucide-react';

/**
 * Page principale d'entretien qui intègre tous les composants nécessaires
 */
const InterviewPage = () => {
  const router = useRouter();
  const { id: interviewId } = router.query;
  const { user } = useAuth();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('interview'); // 'interview', 'analytics' ou 'ai-assistant'
  const [teamId, setTeamId] = useState(null);
  const [aiContents, setAiContents] = useState([]);
  const [loadingAiContents, setLoadingAiContents] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const videoRef = useRef(null);
  
  // Charger les détails de l'entretien
  useEffect(() => {
    if (!interviewId || !user) return;
    
    const fetchInterviewDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/interviews/${interviewId}`);
        setInterview(response.data);
        
        // Si l'entretien appartient à une équipe, récupérer l'ID de l'équipe
        if (response.data.team_id) {
          setTeamId(response.data.team_id);
        }
        
        // En mode développement, simuler des questions suggérées
        if (process.env.NODE_ENV === 'development' && response.data.interview_mode === 'collaborative') {
          const mockSuggestions = [
            { id: 'sugg1', question: "Pouvez-vous me parler d'une situation où vous avez dû résoudre un conflit dans votre équipe ?", type: "behavioral" },
            { id: 'sugg2', question: "Quelle est votre expérience avec les frameworks frontend modernes comme React et Vue ?", type: "technical" },
            { id: 'sugg3', question: "Comment abordez-vous l'optimisation des performances dans vos applications ?", type: "technical" }
          ];
          setSuggestedQuestions(mockSuggestions);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des détails de l\'entretien:', err);
        setError('Impossible de charger les détails de l\'entretien. Veuillez réessayer.');
        setLoading(false);
      }
    };
    
    fetchInterviewDetails();
  }, [interviewId, user]);
  
  // Charger les contenus générés par l'IA
  useEffect(() => {
    if (activeTab !== 'ai-assistant' || !interviewId) return;
    
    const fetchAIContents = async () => {
      try {
        setLoadingAiContents(true);
        
        // En environnement de développement, utiliser des données mockées
        if (process.env.NODE_ENV === 'development') {
          await new Promise(resolve => setTimeout(resolve, 800));
          const mockContents = [
            {
              id: 'content-1',
              ai_assistant_id: 'ai-001',
              ai_assistant_name: 'TechEvaluator',
              content_type: 'analysis',
              content: 'Le candidat a montré une bonne compréhension des concepts fondamentaux de React, mais semble avoir des lacunes dans la gestion d\'état avancée et les patterns de performance. Recommandation: approfondir ces aspects avant de prendre une décision finale.',
              metadata: {
                analysis_type: 'technical',
                focus: 'React, Frontend'
              },
              created_at: new Date(Date.now() - 1200000).toISOString()
            },
            {
              id: 'content-2',
              ai_assistant_id: 'ai-002',
              ai_assistant_name: 'HR Assistant',
              content_type: 'evaluation',
              content: 'Communication claire et professionnelle. Le candidat a fait preuve d\'une bonne capacité d\'écoute et de réflexion avant de répondre aux questions techniques. Points forts: adaptabilité, travail d\'équipe mentionné à plusieurs reprises avec des exemples concrets.',
              metadata: {
                evaluation_score: 8.5
              },
              created_at: new Date(Date.now() - 900000).toISOString()
            },
            {
              id: 'content-3',
              ai_assistant_id: 'ai-003',
              ai_assistant_name: 'Language Analyst',
              content_type: 'comment',
              content: 'Vocabulaire technique précis et approprié. Structure des phrases claire mais parfois trop verbeuse. Conseils pour le candidat: être plus concis dans les explications techniques.',
              created_at: new Date(Date.now() - 600000).toISOString()
            }
          ];
          setAiContents(mockContents);
        } else {
          // En production, appeler l'API réelle
          const filters = teamId ? { teamId } : {};
          const contents = await AIAssistantService.getAIContents(interviewId, filters);
          setAiContents(contents);
        }
        
        setLoadingAiContents(false);
      } catch (err) {
        console.error('Erreur lors du chargement des contenus IA:', err);
        setLoadingAiContents(false);
      }
    };
    
    fetchAIContents();
  }, [interviewId, activeTab, teamId]);
  
  // Gérer la fin de l'entretien
  const handleInterviewComplete = async (result) => {
    try {
      // Rediriger vers la page de résumé
      router.push(`/interviews/${interviewId}/summary`);
    } catch (err) {
      setError('Erreur lors de la finalisation de l\'entretien.');
    }
  };
  
  // Gérer les erreurs
  const handleError = (err) => {
    console.error('Erreur dans l\'entretien:', err);
    setError(typeof err === 'string' ? err : 'Une erreur est survenue durant l\'entretien.');
  };
  
  // Demander une analyse à l'IA
  const handleRequestAnalysis = async (aiAssistantId, analysisType, parameters) => {
    try {
      if (!teamId) {
        setError('Impossible de demander une analyse: cet entretien n\'est pas associé à une équipe.');
        return;
      }
      
      // En environnement de développement, simuler une analyse
      if (process.env.NODE_ENV === 'development') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Ajouter la nouvelle analyse aux contenus existants
        const newAnalysis = {
          id: `content-${Date.now()}`,
          ai_assistant_id: aiAssistantId,
          ai_assistant_name: 'TechEvaluator', // Nom fictif
          content_type: 'analysis',
          content: `Analyse ${analysisType} demandée et générée avec succès. Paramètres: ${JSON.stringify(parameters || {})}.\n\nCette analyse est un exemple généré pour le mode développement.`,
          metadata: {
            analysis_type: analysisType,
            ...parameters
          },
          created_at: new Date().toISOString()
        };
        
        setAiContents(prev => [newAnalysis, ...prev]);
        return;
      }
      
      // En production, appeler l'API
      const result = await AIAssistantService.requestAnalysis(
        teamId,
        interviewId,
        aiAssistantId,
        analysisType,
        parameters
      );
      
      // Recharger les contenus IA
      const filters = teamId ? { teamId } : {};
      const contents = await AIAssistantService.getAIContents(interviewId, filters);
      setAiContents(contents);
      
    } catch (err) {
      console.error('Erreur lors de la demande d\'analyse:', err);
      setError('Impossible de demander une analyse IA. Veuillez réessayer.');
    }
  };
  
  // Utiliser une question suggérée
  const handleUseSuggestedQuestion = (question) => {
    // Implémenter la logique pour utiliser la question suggérée
    console.log('Question utilisée:', question);
    
    // Retirer la question de la liste des suggestions
    setSuggestedQuestions(prev => prev.filter(q => q.id !== question.id));
    
    // Ajouter une nouvelle suggestion après un délai (simuler l'IA)
    setTimeout(() => {
      const newSuggestion = {
        id: `sugg-${Date.now()}`,
        question: "Comment gérez-vous les délais serrés et la pression dans vos projets ?",
        type: "behavioral"
      };
      setSuggestedQuestions(prev => [...prev, newSuggestion]);
    }, 5000);
  };
  
  // Gérer la demande d'une nouvelle suggestion de question
  const handleRequestNewSuggestion = () => {
    // Simuler une charge
    const mockNewSuggestion = {
      id: `sugg-${Date.now()}`,
      question: "Pouvez-vous décrire votre approche pour tester vos applications ?",
      type: "technical"
    };
    setSuggestedQuestions(prev => [...prev, mockNewSuggestion]);
  };
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Chargement de l'entretien...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  // Déterminer les props de l'entretien
  const jobRole = interview?.jobTitle || interview?.position || interview?.job_role || 'Non spécifié';
  const experienceLevel = interview?.experienceLevel || interview?.experience_level || 'Intermédiaire';
  const interviewMode = interview?.interview_mode || 'autonomous';
  
  return (
    <>
      <Head>
        <title>Entretien | RecruteIA</title>
      </Head>
      
      {error && (
        <Alert 
          type="error" 
          title="Erreur" 
          message={error}
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}
      
      {/* En-tête de page */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Entretien pour {jobRole}
          </h1>
          <div className="text-gray-600 mt-1 flex items-center flex-wrap">
            <span>Niveau: {experienceLevel}</span>
            <span className="mx-2">|</span>
            {interview?.scheduledFor ? (
              <span>Prévu: {formatDate(interview.scheduledFor)}</span>
            ) : (
              <span>Non programmé</span>
            )}
            <span className="mx-2">|</span>
            {/* Badge du mode d'entretien */}
            {interviewMode === 'autonomous' ? (
              <Badge color="blue" className="ml-1 flex items-center">
                <BotIcon size={14} className="mr-1" />
                IA autonome
              </Badge>
            ) : (
              <Badge color="green" className="ml-1 flex items-center">
                <UserPlus size={14} className="mr-1" />
                IA collaborative
              </Badge>
            )}
          </div>
        </div>
        
        {/* Onglets */}
        <div className="mt-4 md:mt-0 flex border-b border-gray-200">
          <button
            className={`mr-4 py-2 ${activeTab === 'interview' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('interview')}
          >
            Entretien
          </button>
          <button
            className={`mr-4 py-2 ${activeTab === 'analytics' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analyse
          </button>
          <button
            className={`mr-4 py-2 ${activeTab === 'ai-assistant' ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('ai-assistant')}
          >
            Assistants IA
          </button>
        </div>
      </div>
      
      {activeTab === 'ai-assistant' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne de gauche - Assistants IA */}
          <div className="lg:col-span-1">
            <RequestAIAnalysis 
              interviewId={interviewId} 
              teamId={teamId}
              onRequestAnalysis={handleRequestAnalysis} 
            />
          </div>
          
          {/* Colonne de droite - Contenu généré par IA */}
          <div className="lg:col-span-2">
            <AIContentsPanel 
              interviewId={interviewId}
              teamId={teamId}
              contents={aiContents}
              loading={loadingAiContents}
            />
          </div>
        </div>
      ) : (
        <InterviewController
          interviewId={interviewId}
          jobRole={jobRole}
          experienceLevel={experienceLevel}
          interviewMode={interviewMode}
          onInterviewComplete={handleInterviewComplete}
          onError={handleError}
        >
          {activeTab === 'interview' ? (
            /* Interface d'entretien */
            <InterviewInterface 
              videoRef={videoRef} 
              interviewMode={interviewMode}
              suggestedQuestions={suggestedQuestions}
              onUseSuggestedQuestion={handleUseSuggestedQuestion}
              onRequestNewSuggestion={handleRequestNewSuggestion}
              isAIChatOpen={isAIChatOpen}
              setIsAIChatOpen={setIsAIChatOpen}
            />
          ) : (
            /* Tableau de bord d'analyse */
            <AnalyticsDashboard videoRef={videoRef} />
          )}
        </InterviewController>
      )}
      
      {/* Chat IA flottant pour le mode collaboratif */}
      {interviewMode === 'collaborative' && activeTab === 'interview' && isAIChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 flex flex-col">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-primary-600 mr-2" />
              <h3 className="font-medium">Assistant IA</h3>
            </div>
            <button 
              onClick={() => setIsAIChatOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <AIAssistantChat interviewId={interviewId} />
          </div>
        </div>
      )}
      
      {/* Bouton pour ouvrir le chat en mode collaboratif */}
      {interviewMode === 'collaborative' && activeTab === 'interview' && !isAIChatOpen && (
        <button
          onClick={() => setIsAIChatOpen(true)}
          className="fixed bottom-6 right-6 bg-primary-600 text-black rounded-full p-3 shadow-lg hover:bg-primary-700 flex items-center"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="ml-2 mr-1">Assistant IA</span>
        </button>
      )}
    </>
  );
};
// DashboardLayout

/**
 * Interface principale d'entretien
 */
const InterviewInterface = ({
  // Props injectées par InterviewController
  loading,
  error,
  questions,
  currentQuestionIndex,
  responses,
  evaluation,
  isEvaluating,
  transcript,
  isRecording,
  biometricData,
  jobRole,
  experienceLevel,
  videoRef,
  handleRecordingStateChange,
  handleTranscriptionComplete,
  handleResponseSubmit,
  handleNextQuestion,
  // Props ajoutées pour la gestion des modes d'entretien
  interviewMode,
  suggestedQuestions,
  onUseSuggestedQuestion,
  onRequestNewSuggestion,
  isAIChatOpen,
  setIsAIChatOpen
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne gauche - Vidéo, analyse biométrique et questions suggérées */}
      <div className="lg:col-span-1">
        <Card className="mb-6">
          <Card.Header>
            <Card.Title>Vidéo du candidat</Card.Title>
          </Card.Header>
          <Card.Body className="p-4">
            <VideoStream ref={videoRef} />
          </Card.Body>
        </Card>
        
        <Card className="mb-6">
          <Card.Header className="flex justify-between items-center">
            <Card.Title>Analyse biométrique</Card.Title>
            <Badge color="indigo">IA</Badge>
          </Card.Header>
          <Card.Body className="p-4">
            <BiometricDashboard 
              biometricData={biometricData} 
            />
          </Card.Body>
        </Card>
        
        {/* Questions suggérées - uniquement en mode collaboratif */}
        {interviewMode === 'collaborative' && (
          <Card>
            <Card.Header className="flex justify-between items-center">
              <Card.Title>Questions suggérées</Card.Title>
              <Badge color="green">IA</Badge>
            </Card.Header>
            <Card.Body className="p-4">
              <SuggestedQuestions
                questions={suggestedQuestions}
                onUseQuestion={onUseSuggestedQuestion}
                onRequestNewSuggestion={onRequestNewSuggestion}
              />
            </Card.Body>
          </Card>
        )}
      </div>
      
      {/* Colonne centrale et droite - Questions et réponses */}
      <div className="lg:col-span-2">
        {/* Question en cours */}
        <Card className="mb-6">
          <Card.Header className="flex justify-between items-center">
            <Card.Title>Question {currentQuestionIndex + 1}/{questions.length}</Card.Title>
            <div className="flex items-center">
              {questions[currentQuestionIndex]?.category && (
                <Badge color="blue" className="mr-2">{questions[currentQuestionIndex].category}</Badge>
              )}
              {interviewMode === 'autonomous' && (
                <Badge color="indigo" className="flex items-center">
                  <BotIcon size={14} className="mr-1" />
                  IA
                </Badge>
              )}
            </div>
          </Card.Header>
          <Card.Body className="p-6">
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : (
              <>
                <Question 
                  question={questions[currentQuestionIndex]} 
                  index={currentQuestionIndex} 
                />
                {questions[currentQuestionIndex]?.difficulty && (
                  <div className="mt-4 text-right">
                    <Badge color={
                      questions[currentQuestionIndex].difficulty === 'difficile' ? 'red' :
                      questions[currentQuestionIndex].difficulty === 'moyenne' ? 'yellow' :
                      'green'
                    }>
                      Difficulté: {questions[currentQuestionIndex].difficulty}
                    </Badge>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>
        
        {/* Enregistrement audio et transcription */}
        <Card className="mb-6">
          <Card.Header>
            <Card.Title>Enregistrement et transcription</Card.Title>
          </Card.Header>
          <Card.Body className="p-6">
            <EnhancedAudioRecorder 
              onTranscriptionComplete={handleTranscriptionComplete}
              isRecordingEnabled={true}
              onRecordingStateChange={handleRecordingStateChange}
              maxRecordingTime={180}
              autoTranscribe={true}
            />
          </Card.Body>
        </Card>
        
        {/* Réponse écrite */}
        <Card className="mb-6">
          <Card.Header>
            <Card.Title>Votre réponse</Card.Title>
          </Card.Header>
          <Card.Body className="p-6">
            <ResponseInput 
              initialValue={transcript}
              onSubmit={handleResponseSubmit}
              disabled={isEvaluating}
            />
          </Card.Body>
        </Card>
        
        {/* Évaluation */}
        {evaluation && (
          <Card className="mb-6">
            <Card.Header className="flex justify-between items-center">
              <Card.Title>Évaluation de la réponse</Card.Title>
              <Badge color="green">IA</Badge>
            </Card.Header>
            <Card.Body className="p-6">
              <EvaluationCard evaluation={evaluation} />
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleNextQuestion}
                  color="primary"
                  size="lg"
                >
                  {currentQuestionIndex < questions.length - 1 
                    ? 'Question suivante' 
                    : 'Terminer l\'entretien'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}
        
        {/* Affichage pendant l'évaluation */}
        {isEvaluating && (
          <Card className="mb-6">
            <Card.Body className="p-6">
              <div className="flex flex-col items-center py-4">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">Évaluation de votre réponse par l'IA...</p>
                <p className="text-xs text-gray-500 mt-2">Cela peut prendre quelques secondes</p>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

/**
 * Tableau de bord d'analyse
 */
const AnalyticsDashboard = ({
  // Props injectées par InterviewController
  questions,
  currentQuestionIndex,
  responses,
  biometricHistory,
  jobRole,
  experienceLevel,
  interviewMode
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <Card.Title>Analyse en temps réel</Card.Title>
        </Card.Header>
        <Card.Body className="p-6">
          <p className="text-gray-600 mb-4">
            Cette section affiche des analyses en temps réel de l'entretien en cours.
          </p>
          
          {/* Statistiques de l'entretien */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Questions</p>
              <p className="text-2xl font-bold">{currentQuestionIndex + 1} / {questions.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Taux de réponse</p>
              <p className="text-2xl font-bold">{
                questions.length > 0 ? 
                Math.round((Object.keys(responses).length / questions.length) * 100) : 0
              }%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Temps moyen</p>
              <p className="text-2xl font-bold">2:34</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-600 font-medium">Score moyen</p>
              <p className="text-2xl font-bold">4.2/5</p>
            </div>
          </div>
          
          {/* Émotions pendant l'entretien */}
          <h3 className="text-lg font-medium mb-3">Tendances émotionnelles</h3>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500 mb-2">
              Cette visualisation montre l'évolution des émotions du candidat pendant l'entretien.
            </p>
            
            {biometricHistory.length > 0 ? (
              <div className="h-64">
                {/* Voir BiometricDashboard pour l'implémentation complète */}
                <p className="text-center text-gray-400">Graphique de tendances émotionnelles</p>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-12">
                Pas encore assez de données pour afficher les tendances
              </p>
            )}
          </div>
          
          {/* Résumé des réponses */}
          <h3 className="text-lg font-medium mb-3">Résumé des réponses</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-600 text-sm">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Question</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Émotions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {questions.map((question, index) => {
                  const hasResponse = responses[index] !== undefined;
                  
                  return (
                    <tr key={index} className={`${hasResponse ? '' : 'text-gray-400'}`}>
                      <td className="py-3 pr-4">{index + 1}</td>
                      <td className="py-3 pr-4 truncate max-w-xs">{question.question}</td>
                      <td className="py-3 pr-4">
                        {hasResponse ? '4.0/5' : '-'}
                      </td>
                      <td className="py-3">
                        {hasResponse ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Confiant
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

InterviewPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default InterviewPage;