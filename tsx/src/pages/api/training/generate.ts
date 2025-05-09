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

  console.log("API: Traitement de la requête de génération d'exercices d'entraînement");
  
  // Pour stocker les chemins de fichiers à nettoyer
  const filesToCleanup: string[] = [];

  try {
    // Parser le formulaire multipart
    const form = new multiparty.Form();
    
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

    const { files, fields } = formData;

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
    
    // Ajouter le langage si présent
    if (fields.language && fields.language.length > 0) {
      backendFormData.append('language', fields.language[0]);
    }

    // URL de votre backend Flask
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    console.log(`API: Envoi de la requête au backend: ${backendUrl}/api/resumes/generate-training-exercises`);
    
    // Envoyer la requête au backend
    const response = await axios.post(
      `${backendUrl}/api/resumes/generate-training-exercises`, 
      backendFormData, 
      { headers: backendFormData.getHeaders() }
    );

    console.log("API: Réponse du backend reçue:", response.status);
    
    // Retourner la réponse du backend
    return res.status(200).json(response.data);
  } catch (error) {
    console.error("API: Erreur lors de la génération d'exercices d'entraînement:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        error: error.response.data.error || `Erreur ${error.response.status} lors de la génération d'exercices d'entraînement`
      });
    }
    
    return res.status(500).json({ error: "Erreur serveur lors de la génération d'exercices d'entraînement" });
  } finally {
    // Nettoyer les fichiers temporaires
    for (const filePath of filesToCleanup) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`API: Fichier temporaire supprimé: ${filePath}`);
        }
      } catch (cleanupError) {
        console.error("API: Erreur lors du nettoyage des fichiers:", cleanupError);
      }
    }
  }
}