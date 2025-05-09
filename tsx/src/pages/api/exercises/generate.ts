import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import FormData from 'form-data';
import multiparty from 'multiparty';
import fs from 'fs';

// Désactiver le bodyParser par défaut de Next.js pour les requêtes multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  console.log("API: Traitement de la requête de génération d'exercices");

  // URL du backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const filesToCleanup: string[] = [];

  try {
    // Vérifier s'il s'agit d'une requête multipart ou JSON
    const contentType = req.headers['content-type'] || '';
    const isMultipart = contentType.startsWith('multipart/form-data');

    // Cas 1: Requête multipart avec fichier
    if (isMultipart) {
      console.log("API: Traitement de la requête multipart");
      
      // Parser le formulaire
      const form = new multiparty.Form();
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

      // Préparer le FormData pour le backend
      const backendFormData = new FormData();
      
      // Ajouter le fichier de description de poste
      if (formData.files.job_description) {
        const jobFile = formData.files.job_description[0];
        filesToCleanup.push(jobFile.path);
        
        console.log("API: Ajout du fichier au FormData:", jobFile.originalFilename);
        
        const fileContent = fs.readFileSync(jobFile.path);
        backendFormData.append('job_description', fileContent, {
          filename: jobFile.originalFilename,
          contentType: jobFile.headers['content-type']
        });
      }
      
      // Ajouter le langage si présent
      if (formData.fields.language) {
        backendFormData.append('language', formData.fields.language[0]);
      }
      
      // Envoyer la requête au backend
      console.log(`API: Envoi de la requête multipart au backend: ${backendUrl}/api/resumes/generate-evaluation-exercises`);
      
      const response = await axios.post(
        `${backendUrl}/api/resumes/generate-evaluation-exercises`, 
        backendFormData, 
        { headers: backendFormData.getHeaders() }
      );
      
      return res.status(200).json(response.data);
    } 
    // Cas 2: Requête JSON
    else {
      console.log("API: Traitement de la requête JSON");
      
      // Activer manuellement le parsing JSON
      let bodyData;
      if (!req.body) {
        const buffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: any = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        });
        bodyData = JSON.parse(buffer.toString());
      } else {
        bodyData = req.body;
      }
      
      console.log(`API: Envoi de la requête JSON au backend: ${backendUrl}/api/resumes/generate-evaluation-exercises`);
      
      const response = await axios.post(
        `${backendUrl}/api/resumes/generate-evaluation-exercises`, 
        bodyData
      );
      
      return res.status(200).json(response.data);
    }
  } catch (error) {
    console.error("API: Erreur lors de la génération d'exercices:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json({ 
        error: error.response.data.error || `Erreur ${error.response.status} lors de la génération d'exercices`
      });
    }
    
    return res.status(500).json({ error: "Erreur serveur lors de la génération d'exercices" });
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