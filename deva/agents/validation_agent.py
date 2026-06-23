from typing import Dict, Any, List
from sqlalchemy.orm import Session
from shared.models import EmailCredential, Template

class ValidationAgent:
    @staticmethod
    def validate_variable_mapping(
        variables: List[str],
        mapping: Dict[str, str],
        lead_columns: List[str]
    ) -> Dict[str, Any]:
        """Check if all variables in a template are correctly mapped to lead list columns"""
        missing_vars = []
        invalid_mappings = []
        
        for var in variables:
            mapped_col = mapping.get(var)
            if not mapped_col:
                missing_vars.append(var)
            elif mapped_col not in lead_columns:
                invalid_mappings.append((var, mapped_col))
                
        is_valid = len(missing_vars) == 0 and len(invalid_mappings) == 0
        
        return {
            "is_valid": is_valid,
            "missing_variables": missing_vars,
            "invalid_mappings": invalid_mappings,
            "message": "Validation successful" if is_valid else f"Mapping has errors: missing {missing_vars}, invalid {invalid_mappings}"
        }

    @staticmethod
    def validate_smtp_credential(db: Session, user_id: str) -> Dict[str, Any]:
        """Verify that the user has a verified SMTP credential connected"""
        credential = db.query(EmailCredential).filter(
            EmailCredential.user_id == user_id,
            EmailCredential.is_verified == True
        ).first()
        
        if not credential:
            return {
                "is_valid": False,
                "error": "No verified email credentials found. Please connect your SMTP settings."
            }
            
        return {
            "is_valid": True,
            "email_address": credential.email_address,
            "provider": credential.provider
        }
