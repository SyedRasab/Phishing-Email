from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import add_custom_rule, get_custom_rules, delete_custom_rule

router = APIRouter()

class CustomRuleRequest(BaseModel):
    user_email: str
    pattern: str
    rule_type: str
    status: str

@router.get("/rules")
def fetch_rules(user_email: str):
    if not user_email:
        raise HTTPException(status_code=400, detail="user_email is required")
    return get_custom_rules(user_email)

@router.post("/rules")
def create_rule(data: CustomRuleRequest):
    if not data.user_email or not data.pattern or not data.rule_type or not data.status:
        raise HTTPException(status_code=400, detail="Missing required fields")
    success = add_custom_rule(data.user_email, data.pattern, data.rule_type, data.status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add rule")
    return {"message": "Rule added successfully"}

@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, user_email: str):
    if not user_email:
        raise HTTPException(status_code=400, detail="user_email is required")
    success = delete_custom_rule(rule_id, user_email)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found or could not be deleted")
    return {"message": "Rule deleted successfully"}
