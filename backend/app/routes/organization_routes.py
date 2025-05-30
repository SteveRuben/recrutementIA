# backend/routes/organization_routes.py
from datetime import datetime
import os
import uuid
from flask import Blueprint, current_app, request, jsonify, g, abort

from ..services.user_service import UserService
from ..services.audit_service import AuditService
from ..models.user import User
from ..models.organization import Organization, OrganizationDomain, OrganizationMember
from app import db
from ..services.organization_service import OrganizationService
from ..middleware.auth_middleware import token_required
from ..middleware.tenant_middleware import organization_required, get_current_organization
from werkzeug.exceptions import BadRequest, Forbidden, NotFound
from werkzeug.utils import secure_filename

organizations_bp = Blueprint('organizations', __name__, url_prefix='/api/organizations')


# Helper pour vérifier les permissions administrateur
def require_admin(organization_id, user_id):
    member = OrganizationMember.query.filter_by(
        organization_id=organization_id,
        user_id=user_id
    ).first()
    
    if not member or member.role not in ['admin', 'owner']:
        abort(403, description="Administrative privileges required")
    
    return member

# Helper pour vérifier les permissions propriétaire
def require_owner(organization_id, user_id):
    member = OrganizationMember.query.filter_by(
        organization_id=organization_id,
        user_id=user_id
    ).first()
    
    if not member or member.role != 'owner':
        abort(403, description="Owner privileges required")
    
    return member


@organizations_bp.route('', methods=['POST'])
@token_required
def create_organization():    
    """Crée une nouvelle organisation"""
    user_id = g.current_user.user_id
    data = request.get_json()
    
    if not data or 'name' not in data:
        abort(400, description="Name is required")
    
    organization_service = OrganizationService()
    try:
        organization = organization_service.create_organization(
            name=data['name'],
            user_id=user_id
            #plan=data.get('plan', 'free')
        )
        
        UserService.update_onboarding_status(user_id=user_id)
        
        return jsonify({
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug
            #"plan": organization.plan
        }), 201
    except Exception as e:
        abort(400, description=str(e))

@organizations_bp.route('/', methods=['GET'])
@token_required
def get_user_organizations():
    """Liste toutes les organisations dont l'utilisateur est membre"""
    user_id = g.current_user.user_id
    organization_service = OrganizationService()
    organizations = organization_service.get_organizations_for_user(user_id)
    
    return jsonify([
        {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "logo_url": org.logo_url,
            "plan": org.plan,
            "is_active": org.is_active,
        }
        for org in organizations
    ])

@organizations_bp.route('/current', methods=['GET'])
@token_required
@organization_required
def get_current_organization_details():
    """Obtient les détails de l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    member = OrganizationMember.query.filter_by(
        organization_id=organization.id,
        user_id=user_id
    ).first()
    
    if not member:
        abort(403, description="You are not a member of this organization")
    
    return jsonify({
        "id": organization.id,
        "name": organization.name,
        "slug": organization.slug,
        "logo_url": organization.logo_url,
        "plan": organization.plan,
        "is_active": organization.is_active,
        "user_role": member.role
    })

@organizations_bp.route('/current', methods=['PUT'])
@token_required
@organization_required
def update_current_organization():
    """Met à jour les informations de l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    data = request.get_json()
    if not data:
        abort(400, description="Invalid data")
    
    organization_service = OrganizationService()
    try:
        updated_org = organization_service.update_organization(
            organization_id=organization.id,
            name=data.get('name'),
            logo_url=data.get('logo_url')
        )
        
        return jsonify({
            "id": updated_org.id,
            "name": updated_org.name,
            "slug": updated_org.slug,
            "logo_url": updated_org.logo_url,
            "plan": updated_org.plan,
            "is_active": updated_org.is_active
        })
    except Exception as e:
        abort(400, description=str(e))

@organizations_bp.route('/current/domains', methods=['POST'])
@token_required
@organization_required
def add_domain_to_organization():
    """Ajoute un domaine à l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    data = request.get_json()
    if not data or 'domain' not in data:
        abort(400, description="Domain is required")
    
    organization_service = OrganizationService()
    try:
        domain = organization_service.add_domain(
            organization_id=organization.id,
            domain=data['domain'],
            is_primary=data.get('is_primary', False)
        )
        
        return jsonify({
            "id": domain.id,
            "domain": domain.domain,
            "is_primary": domain.is_primary,
            "is_verified": domain.is_verified,
            "verification_token": domain.verification_token
        }), 201
    except ValueError as e:
        abort(400, description=str(e))

@organizations_bp.route('/current/domains', methods=['GET'])
@token_required
@organization_required
def get_organization_domains():
    """Liste tous les domaines de l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier que l'utilisateur est membre
    member = OrganizationMember.query.filter_by(
        organization_id=organization.id,
        user_id=user_id
    ).first()
    
    if not member:
        abort(403, description="You are not a member of this organization")
    
    return jsonify([
        {
            "id": domain.id,
            "domain": domain.domain,
            "is_primary": domain.is_primary,
            "is_verified": domain.is_verified,
            "verification_token": domain.verification_token if member.role in ["admin", "owner"] else None
        }
        for domain in organization.domains
    ])



@organizations_bp.route('/current/domains/<domain_id>/verify-dns', methods=['POST'])
@token_required
@organization_required
def verify_domain_dns(domain_id):
    """Vérifie un domaine en consultant les enregistrements DNS TXT"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    # Vérifier que le domaine appartient à l'organisation
    domain = OrganizationDomain.query.filter_by(
        id=domain_id, 
        organization_id=organization.id
    ).first()
    
    if not domain:
        abort(404, description="Domain not found")
        
    import dns.resolver
    try:
        # Résoudre les enregistrements TXT
        answers = dns.resolver.resolve(domain.domain, 'TXT')
        # Chercher le token de vérification dans les enregistrements
        token_found = False
        for rdata in answers:
            for txt_string in rdata.strings:
                txt_value = txt_string.decode('utf-8')
                if txt_value == f"recrute-ia-verify={domain.verification_token}":
                    token_found = True
                    break
        
        if token_found:
            # Marquer le domaine comme vérifié
            domain.is_verified = True
            db.session.commit()
            
            # Lancer le script pour générer la configuration Nginx
            # (ceci devrait être fait de manière asynchrone)
            import subprocess
            subprocess.Popen(["/path/to/your/app/scripts/generate_domain_configs.py"])
            
            return jsonify({
                "id": domain.id,
                "domain": domain.domain,
                "is_primary": domain.is_primary,
                "is_verified": True,
                "message": "Domain verified successfully"
            })
        else:
            return jsonify({
                "id": domain.id,
                "domain": domain.domain,
                "is_verified": False,
                "message": f"TXT record with value 'recrute-ia-verify={domain.verification_token}' not found"
            })
    except dns.resolver.NXDOMAIN:
        return jsonify({
            "id": domain.id,
            "domain": domain.domain,
            "is_verified": False,
            "message": "Domain does not exist"
        })
    except Exception as e:
        return jsonify({
            "id": domain.id,
            "domain": domain.domain,
            "is_verified": False,
            "message": f"Error checking DNS: {str(e)}"
        })

# Suppression de domaine
@organizations_bp.route('/current/domains/<domain_id>', methods=['DELETE'])
@token_required
@organization_required
def delete_domain(domain_id):
    """Supprime un domaine de l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    # Vérifier que le domaine appartient à l'organisation
    domain = OrganizationDomain.query.filter_by(
        id=domain_id, 
        organization_id=organization.id
    ).first()
    
    if not domain:
        abort(404, description="Domain not found")
    
    # Ne pas supprimer le domaine primaire s'il est vérifié et qu'il n'y a pas d'autre domaine vérifié
    if domain.is_primary and domain.is_verified:
        verified_domains = OrganizationDomain.query.filter(
            OrganizationDomain.organization_id == organization.id,
            OrganizationDomain.is_verified == True,
            OrganizationDomain.id != domain_id
        ).count()
        
        if verified_domains == 0:
            abort(400, description="Cannot delete the only verified primary domain")
    
    db.session.delete(domain)
    db.session.commit()
    
    return jsonify({"message": "Domain deleted successfully"})

# Définir un domaine comme primaire
@organizations_bp.route('/current/domains/<domain_id>/set-primary', methods=['PUT'])
@token_required
@organization_required
def set_primary_domain(domain_id):
    """Définit un domaine comme domaine primaire de l'organisation"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    # Vérifier que le domaine appartient à l'organisation
    domain = OrganizationDomain.query.filter_by(
        id=domain_id, 
        organization_id=organization.id
    ).first()
    
    if not domain:
        abort(404, description="Domain not found")
    
    # Vérifier que le domaine est vérifié
    if not domain.is_verified:
        abort(400, description="Cannot set an unverified domain as primary")
    
    # Mettre à jour tous les domaines
    OrganizationDomain.query.filter_by(
        organization_id=organization.id
    ).update({"is_primary": False})
    
    # Définir le nouveau domaine primaire
    domain.is_primary = True
    db.session.commit()
    
    return jsonify({
        "id": domain.id,
        "domain": domain.domain,
        "is_primary": True,
        "is_verified": domain.is_verified
    })

# Obtenir la liste des membres
@organizations_bp.route('/current/members', methods=['GET'])
@token_required
@organization_required
def get_organization_members():
    """Liste tous les membres de l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier que l'utilisateur est membre
    member = OrganizationMember.query.filter_by(
        organization_id=organization.id,
        user_id=user_id
    ).first()
    
    if not member:
        abort(403, description="You are not a member of this organization")
    
    # Récupérer tous les membres avec les informations des utilisateurs
    members = db.session.query(OrganizationMember, User).join(
        User, OrganizationMember.user_id == User.id
    ).filter(
        OrganizationMember.organization_id == organization.id
    ).all()
    
    return jsonify([
        {
            "id": m[0].id,
            "user_id": m[1].id,
            "email": m[1].email,
            "name": f"{m[1].first_name} {m[1].last_name}" if m[1].first_name and m[1].last_name else m[1].email,
            "role": m[0].role,
            "created_at": m[0].created_at.isoformat() if m[0].created_at else None
        }
        for m in members
    ])

# Ajouter un membre
@organizations_bp.route('/current/members', methods=['POST'])
@token_required
@organization_required
def add_member_to_organization():
    """Ajoute un membre à l'organisation active"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    data = request.get_json()
    if not data or 'email' not in data:
        abort(400, description="Email is required")
    
    # Vérifier que le rôle est valide
    role = data.get('role', 'member')
    if role not in ["member", "admin", "owner"]:
        abort(400, description="Invalid role")
    
    # Vérifier les permissions pour ajouter un propriétaire
    if role == "owner" and member.role != "owner":
        abort(403, description="Only owners can add new owners")
    
    # Trouver l'utilisateur par email
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        abort(404, description="User not found")
    
    organization_service = OrganizationService()
    
    try:
        new_member = organization_service.add_member(
            organization_id=organization.id,
            user_id=user.id,
            role=role
        )
        
        return jsonify({
            "id": new_member.id,
            "user_id": user.id,
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.email,
            "role": new_member.role
        }), 201
    except Exception as e:
        abort(400, description=str(e))

# Mettre à jour le rôle d'un membre
@organizations_bp.route('/current/members/<user_id>', methods=['PUT'])
@token_required
@organization_required
def update_member_role(user_id):
    """Met à jour le rôle d'un membre de l'organisation active"""
    current_user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    current_member = require_admin(organization.id, current_user_id)
    
    data = request.get_json()
    if not data or 'role' not in data:
        abort(400, description="Role is required")
    
    # Vérifier que le rôle est valide
    role = data['role']
    if role not in ["member", "admin", "owner"]:
        abort(400, description="Invalid role")
    
    # Vérifier les permissions pour promouvoir un propriétaire
    if role == "owner" and current_member.role != "owner":
        abort(403, description="Only owners can promote members to owner")
    
    # Vérifier si l'utilisateur modifie son propre rôle
    if user_id == current_user_id and role != current_member.role:
        abort(400, description="You cannot change your own role")
    
    organization_service = OrganizationService()
    
    try:
        success = organization_service.update_member_role(
            organization_id=organization.id,
            user_id=user_id,
            new_role=role
        )
        
        if not success:
            abort(404, description="Member not found")
        
        # Récupérer les informations utilisateur
        user = User.query.filter_by(id=user_id).first()
        member = OrganizationMember.query.filter_by(
            organization_id=organization.id,
            user_id=user_id
        ).first()
        
        return jsonify({
            "id": member.id,
            "user_id": user.id,
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.email,
            "role": member.role
        })
    except ValueError as e:
        abort(400, description=str(e))

# Supprimer un membre
@organizations_bp.route('/current/members/<user_id>', methods=['DELETE'])
@token_required
@organization_required
def remove_member_from_organization(user_id):
    """Supprime un membre de l'organisation active"""
    current_user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    current_member = require_admin(organization.id, current_user_id)
    
    # Vérifier que l'utilisateur ne supprime pas son propre compte
    if user_id == current_user_id:
        abort(400, description="You cannot remove yourself from the organization")
    
    organization_service = OrganizationService()
    
    try:
        success = organization_service.remove_member(
            organization_id=organization.id,
            user_id=user_id
        )
        
        if not success:
            abort(404, description="Member not found")
        
        return jsonify({"message": "Member removed successfully"})
    except ValueError as e:
        abort(400, description=str(e))

# Changer d'organisation active
@organizations_bp.route('/switch/<organization_id>', methods=['POST'])
@token_required
def switch_organization(organization_id):
    """Change l'organisation active de l'utilisateur"""
    user_id = g.current_user.user_id
    
    # Vérifier que l'utilisateur est membre de l'organisation
    member = OrganizationMember.query.filter_by(
        organization_id=organization_id,
        user_id=user_id
    ).first()
    
    if not member:
        abort(403, description="You are not a member of this organization")
    
    # Mettre à jour l'organisation active
    user = User.query.filter_by(id=user_id).first()
    if not user:
        abort(404, description="User not found")
    
    user.current_organization_id = organization_id
    db.session.commit()
    
    # Récupérer l'organisation
    organization = Organization.query.filter_by(id=organization_id).first()
    
    return jsonify({
        "id": organization.id,
        "name": organization.name,
        "slug": organization.slug,
        "logo_url": organization.logo_url,
        "user_role": member.role
    })

# Inviter un utilisateur par email (créer un compte s'il n'existe pas)
@organizations_bp.route('/current/invitations', methods=['POST'])
@token_required
@organization_required
def invite_user_to_organization():
    """Invite un utilisateur à rejoindre l'organisation par email"""
    user_id = g.current_user.user_id
    organization = get_current_organization()
    
    # Vérifier les permissions d'administration
    member = require_admin(organization.id, user_id)
    
    data = request.get_json()
    if not data or 'email' not in data:
        abort(400, description="Email is required")
    
    email = data['email']
    role = data.get('role', 'member')
    
    # Vérifier que le rôle est valide
    if role not in ["member", "admin", "owner"]:
        abort(400, description="Invalid role")
    
    # Vérifier les permissions pour inviter un propriétaire
    if role == "owner" and member.role != "owner":
        abort(403, description="Only owners can invite new owners")
    
    # Vérifier si l'utilisateur existe déjà
    user = User.query.filter_by(email=email).first()
    
    # Si l'utilisateur existe, l'ajouter directement
    if user:
        organization_service = OrganizationService()
        try:
            new_member = organization_service.add_member(
                organization_id=organization.id,
                user_id=user.id,
                role=role
            )
            
            # TODO: Envoyer un email de notification
            
            return jsonify({
                "id": new_member.id,
                "user_id": user.id,
                "email": user.email,
                "status": "member_added",
                "role": new_member.role
            }), 201
        except Exception as e:
            abort(400, description=str(e))
    
    # Si l'utilisateur n'existe pas, créer une invitation
    # Note: Pour simplifier, je n'inclus pas tout le code de gestion des invitations ici
    # Cette partie nécessiterait un modèle Invitation et des routes supplémentaires
    
    # Pour cet exemple, générons un token et supposons qu'un email sera envoyé
    invitation_token = str(uuid.uuid4())
    
    # TODO: Enregistrer l'invitation dans la base de données
    # TODO: Envoyer un email d'invitation
    
    return jsonify({
        "email": email,
        "status": "invitation_sent",
        "role": role,
        "invitation_token": invitation_token  # En production, ne pas exposer ce token
    }), 201

@organizations_bp.route('/api/invitations/<token>/accept', methods=['POST'])
def accept_invitation(token):
    # Récupérer l'ID utilisateur depuis le token JWT si connecté
    # Appeler invitation_service.accept_invitation()
    # Retourner le résultat
    pass

# Route pour annuler une invitation
@organizations_bp.route('/api/organizations/<org_id>/invitations/<invitation_id>', methods=['DELETE'])
@token_required
@organization_required
def cancel_invitation(org_id, invitation_id):
    # Vérifier les droits de l'utilisateur
    # Appeler invitation_service.cancel_invitation()
    # Retourner le résultat
    pass

# Route pour renvoyer une invitation
@organizations_bp.route('/api/organizations/<org_id>/invitations/<invitation_id>/resend', methods=['POST'])
@token_required
@organization_required
def resend_invitation(org_id, invitation_id):
    # Vérifier les droits de l'utilisateur
    # Appeler invitation_service.resend_invitation()
    # Retourner le résultat
    pass

# Route pour lister les invitations en cours
@organizations_bp.route('/api/organizations/<org_id>/invitations', methods=['GET'])
@token_required
@organization_required
def list_invitations(org_id):
    # Récupérer les invitations actives pour l'organisation
    # Retourner la liste
    pass

# Statistiques de l'organisation
@organizations_bp.route('/current/stats', methods=['GET'])
@token_required
@organization_required
def get_organization_stats():
    """Obtient des statistiques sur l'organisation active"""
    user_id = get_jwt_identity()
    organization = get_current_organization()
    
    # Vérifier que l'utilisateur est membre
    member = OrganizationMember.query.filter_by(
        organization_id=organization.id,
        user_id=user_id
    ).first()
    
    if not member:
        abort(403, description="You are not a member of this organization")
    
    # Récupérer les statistiques de base
    member_count = OrganizationMember.query.filter_by(
        organization_id=organization.id
    ).count()
    
    domain_count = OrganizationDomain.query.filter_by(
        organization_id=organization.id
    ).count()
    
    verified_domain_count = OrganizationDomain.query.filter_by(
        organization_id=organization.id,
        is_verified=True
    ).count()
    
    # Récupérer le compte des assistants IA (si vous avez cette relation)
    ai_assistant_count = 0
    from models.ai_assistant import AIAssistant
    if hasattr(AIAssistant, 'organization_id'):
        ai_assistant_count = AIAssistant.query.filter_by(
            organization_id=organization.id
        ).count()
    
    return jsonify({
        "members": {
            "total": member_count,
            "by_role": {
                "owner": OrganizationMember.query.filter_by(organization_id=organization.id, role="owner").count(),
                "admin": OrganizationMember.query.filter_by(organization_id=organization.id, role="admin").count(),
                "member": OrganizationMember.query.filter_by(organization_id=organization.id, role="member").count()
            }
        },
        "domains": {
            "total": domain_count,
            "verified": verified_domain_count
        },
        "ai_assistants": ai_assistant_count,
        # Vous pouvez ajouter d'autres statistiques spécifiques à votre application
    })
    

@organizations_bp.route('/api/organizations/<org_id>/audit-logs', methods=['GET'])
@token_required
@organization_required
def get_audit_logs(org_id):
    """Récupère les logs d'audit de l'organisation avec filtrage et pagination."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Construction des filtres à partir des query params
    filters = {}
    for param in ['user_id', 'action', 'entity_type', 'entity_id']:
        if param in request.args:
            filters[param] = request.args.get(param)
    
    # Filtres de date
    if 'date_from' in request.args:
        try:
            filters['date_from'] = datetime.fromisoformat(request.args.get('date_from'))
        except ValueError:
            return jsonify({"error": "Format de date invalide pour date_from"}), 400
            
    if 'date_to' in request.args:
        try:
            filters['date_to'] = datetime.fromisoformat(request.args.get('date_to'))
        except ValueError:
            return jsonify({"error": "Format de date invalide pour date_to"}), 400
    
    audit_service = AuditService()
    logs = audit_service.get_organization_logs(org_id, filters, page, per_page)
    
    # Transformation en dictionnaire pour la réponse JSON
    return jsonify({
        "items": [log.to_dict() for log in logs.items],
        "total": logs.total,
        "pages": logs.pages,
        "page": logs.page
    })

@organizations_bp.route('/api/organizations/<org_id>/audit-logs/entity/<entity_type>/<entity_id>', methods=['GET'])
@token_required
@organization_required
def get_entity_history(org_id, entity_type, entity_id):
    """Récupère l'historique complet d'une entité spécifique."""
    audit_service = AuditService()
    logs = audit_service.get_entity_history(org_id, entity_type, entity_id)
    
    return jsonify([log.to_dict() for log in logs])

@organizations_bp.route('/upload-logo', methods=['POST'])
@token_required
def upload_logo():
    """Télécharger un logo pour l'organisation"""

    if 'logo' not in request.files:
        return jsonify({'message': 'Aucun fichier trouvé'}), 400
    
    file = request.files['logo']
    
    if file.filename == '':
        return jsonify({'message': 'Aucun fichier sélectionné'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            # Générer un nom unique pour le fichier
            unique_filename = f"{uuid.uuid4()}_{filename}"
            
            # Créer le répertoire de stockage si nécessaire
            upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'logos')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Sauvegarder le fichier
            file_path = os.path.join(upload_dir, unique_filename)
            file.save(file_path)
            
            # URL publique du logo
            logo_url = f"/uploads/logos/{unique_filename}"
            
            return jsonify({'logo_url': logo_url}), 200
            
        except Exception as e:
            current_app.logger.error(f"Erreur lors du téléchargement du logo: {str(e)}")
            return jsonify({'message': 'Une erreur est survenue lors du téléchargement du logo'}), 500
    
    return jsonify({'message': 'Type de fichier non autorisé'}), 400


def allowed_file(filename):
    """Vérifier si le type de fichier est autorisé"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
