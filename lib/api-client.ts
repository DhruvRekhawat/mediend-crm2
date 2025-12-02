import { ApiResponse } from './api-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiRequest<T>(endpoint, { method: 'GET' })
  if (!response.success) {
    throw new Error(response.error || 'Request failed')
  }
  return response.data as T
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.success) {
    throw new Error(response.error || 'Request failed')
  }
  return response.data as T
}

export async function apiPatch<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!response.success) {
    throw new Error(response.error || 'Request failed')
  }
  return response.data as T
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiRequest<T>(endpoint, { method: 'DELETE' })
  if (!response.success) {
    throw new Error(response.error || 'Request failed')
  }
  return response.data as T
}

