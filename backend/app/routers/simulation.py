from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import trigger_simulation, update_simulation_action

router = APIRouter()

class TriggerSimulationRequest(BaseModel):
    template: str

class SimulationActionRequest(BaseModel):
    action: str

@router.post("/users/{email}/simulate")
def trigger_sim_attack(email: str, data: TriggerSimulationRequest):
    sim = trigger_simulation(email, data.template)
    if not sim:
        raise HTTPException(status_code=500, detail="Failed to trigger simulation")
    return {
        "message": "Simulation triggered",
        "id": sim["id"],
        "subject": sim["subject"],
        "sender": sim["sender"]
    }

@router.post("/scan/{scan_id}/simulation-action")
def track_simulation_action(scan_id: int, data: SimulationActionRequest):
    record = update_simulation_action(scan_id, data.action)
    if not record:
        raise HTTPException(status_code=404, detail="Simulation scan not found")
    return {
        "message": f"Action {data.action} tracked",
        "status": record["simulation_status"]
    }
