const API_BASE = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL;
const baseUrl = API_BASE ? API_BASE.replace(/\/$/, "") : "";

export async function registerUser(email: string, role: string = "employee"): Promise<any> {
  const res = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) throw new Error(`register user ${res.status}`);
  return await res.json();
}

export async function getUser(email: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`get user ${res.status}`);
  return await res.json();
}

export async function getUsers(): Promise<any> {
  const res = await fetch(`${baseUrl}/users`);
  if (!res.ok) throw new Error(`get users ${res.status}`);
  return await res.json();
}

export async function updateCredentials(email: string, google_client_id: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}/credentials`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ google_client_id }),
  });
  if (!res.ok) throw new Error(`update credentials ${res.status}`);
  return await res.json();
}

export async function deleteUser(email: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`delete user ${res.status}`);
  return await res.json();
}

export async function updateUserStatus(email: string, status: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`update user status ${res.status}`);
  return await res.json();
}

export async function triggerSimulation(email: string, template: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(email)}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template }),
  });
  if (!res.ok) throw new Error(`trigger simulation ${res.status}`);
  return await res.json();
}

export async function submitSimulationAction(scanId: number, action: "click" | "report"): Promise<any> {
  const res = await fetch(`${baseUrl}/scan/${scanId}/simulation-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`submit simulation action ${res.status}`);
  return await res.json();
}
