// pages/api/resumes/analyze.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import multiparty from 'multiparty';
import fs from 'fs';
import FormData from 'form-data';

// Désactiver le bodyParser par défaut de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  console.log("API: Début du traitement de la requête d'analyse");
  
  // Pour stocker les chemins de fichiers à nettoyer
  const filesToCleanup: string[] = [];

  try {
    // Configurer multiparty pour parser les données multipart
    const form = new multiparty.Form({
      maxFilesSize: 10 * 1024 * 1024, // 10MB
    });
    
    // Parser la requête
    const formData = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("API: Erreur lors du parsing du formulaire:", err);
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    });

    const { files } = formData;

    console.log("API: Formulaire parsé");
    console.log("API: Fichiers reçus:", Object.keys(files));

    // Créer une nouvelle FormData pour l'envoi au backend
    const backendFormData = new FormData();
    
    // Ajouter le fichier CV
    if (!files.resume || files.resume.length === 0) {
      console.error("API: CV manquant");
      return res.status(400).json({ error: 'Fichier CV manquant' });
    }
    
    const resumeFile = files.resume[0];
    filesToCleanup.push(resumeFile.path);
    
    console.log("API: Lecture du fichier CV:", resumeFile.path);
    
    const resumeContent = fs.readFileSync(resumeFile.path);
    backendFormData.append('resume', resumeContent, {
      filename: resumeFile.originalFilename || 'resume.pdf',
      contentType: resumeFile.headers['content-type'] || 'application/pdf',
    });
    
    // Ajouter le fichier de description de poste
    if (!files.job_description || files.job_description.length === 0) {
      console.error("API: Description de poste manquante");
      return res.status(400).json({ error: 'Fichier de description de poste manquant' });
    }
    
    const jobFile = files.job_description[0];
    filesToCleanup.push(jobFile.path);
    
    console.log("API: Lecture du fichier de description de poste:", jobFile.path);
    
    const jobContent = fs.readFileSync(jobFile.path);
    backendFormData.append('job_description', jobContent, {
      filename: jobFile.originalFilename || 'job_description.txt',
      contentType: jobFile.headers['content-type'] || 'text/plain',
    });

    // URL de votre backend Flask
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    console.log(`API: Envoi de la requête au backend: ${backendUrl}/api/resumes/match-job`);
    
    // Envoyer la requête au backend
    const response = await axios.post(`${backendUrl}/api/resumes/match-job`, backendFormData, {
      headers: {
        ...backendFormData.getHeaders(),
      },
    });

    console.log("API: Réponse du backend reçue:", response.status);
    
    // Retourner la réponse du backend
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('API: Erreur complète lors de l\'analyse du CV:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('API: Réponse d\'erreur du backend:', error.response.status, error.response.data);
        return res.status(error.response.status).json({ 
          error: error.response.data.error || `Erreur ${error.response.status} lors de l'analyse du CV`,
          details: error.response.data
        });
      } else if (error.request) {
        console.error('API: Pas de réponse du backend:', error.request);
        return res.status(502).json({ error: 'Aucune réponse du serveur backend' });
      } else {
        console.error('API: Erreur de configuration axios:', error.message);
        return res.status(500).json({ error: `Erreur de configuration: ${error.message}` });
      }
    }
    
    return res.status(500).json({ error: 'Erreur serveur lors de l\'analyse du CV' });
  } finally {
    // Nettoyer les fichiers temporaires
    try {
      for (const filePath of filesToCleanup) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`API: Fichier temporaire supprimé: ${filePath}`);
        }
      }
    } catch (cleanupError) {
      console.error('API: Erreur lors du nettoyage des fichiers temporaires:', cleanupError);
    }
  }
}