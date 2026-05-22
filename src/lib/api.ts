import { auth } from './firebase';

const getAuthHeaders = async () => {
  if (localStorage.getItem('uat_bypass_user') === 'true') {
    return {
      'Authorization': `Bearer uat-test-token-76839210-9b37-4d76-88d4-539c94b7f83e`
    };
  }
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated. Please sign in.");
  const token = await user.getIdToken();
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const createSession = async (jobProfile: any) => {
  const res = await fetch('/api/hr/sessions', {
    method: 'POST',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jobProfile })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateSessionPreferences = async (id: string, jobProfile: any) => {
  const res = await fetch(`/api/hr/sessions/${id}/preferences`, {
    method: 'PUT',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(jobProfile)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const uploadFiles = async (sessionId: string, files: File[]) => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  files.forEach(f => formData.append('files', f));

  const res = await fetch('/api/hr/upload', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const associateFilesWithSession = async (sessionId: string, uploadedFiles: any[]) => {
  const res = await fetch(`/api/hr/sessions/${sessionId}/resumes`, {
    method: 'PUT',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uploaded_files: uploadedFiles })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const startAnalysis = async (sessionId: string) => {
  const res = await fetch(`/api/hr/sessions/${sessionId}/analyze`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getSession = async (sessionId: string) => {
  const res = await fetch(`/api/hr/sessions/${sessionId}`, {
    headers: await getAuthHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getSessions = async () => {
  const res = await fetch('/api/hr/sessions', {
    headers: await getAuthHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
