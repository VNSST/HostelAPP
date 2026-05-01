const API_BASE = 'http://localhost:5000/api';

export const getTenantHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('tenant_token')}`
});

export async function tenantApiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getTenantHeaders(),
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function tenantApiPostForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default API_BASE;
