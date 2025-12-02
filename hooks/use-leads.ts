'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { getCachedLeads, cacheLeads } from '@/lib/indexeddb'
import { useState, useEffect } from 'react'

export interface LeadFilters {
  pipelineStage?: string
  status?: string
  bdId?: string
  teamId?: string
  circle?: string
  city?: string
  hospitalName?: string
  treatment?: string
  source?: string
  startDate?: string
  endDate?: string
}

export function useLeads(filters: LeadFilters = {}) {
  const queryClient = useQueryClient()
  const [cachedData, setCachedData] = useState<any>(null)

  const cacheKey = `leads_${JSON.stringify(filters)}`

  useEffect(() => {
    getCachedLeads(cacheKey).then((data) => {
      if (data) {
        setCachedData(data)
      }
    })
  }, [cacheKey])

  const query = useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const data = await apiGet<any[]>(`/api/leads?${params.toString()}`)
      await cacheLeads(cacheKey, data)
      return data
    },
    enabled: true,
    placeholderData: cachedData,
  })

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: any) => {
      return apiPost('/api/leads', leadData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiPatch(`/api/leads/${id}`, data)
    },
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['leads'] })
      const previousLeads = queryClient.getQueryData(['leads', filters])
      
      queryClient.setQueryData(['leads', filters], (old: any[]) => {
        if (!old) return old
        return old.map((lead) => (lead.id === id ? { ...lead, ...data } : lead))
      })

      return { previousLeads }
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads', filters], context.previousLeads)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  return {
    leads: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createLead: createLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    isCreating: createLeadMutation.isPending,
    isUpdating: updateLeadMutation.isPending,
  }
}

export function useLead(id: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['lead', id],
    queryFn: () => apiGet(`/api/leads/${id}`),
    enabled: !!id && !!id.length,
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiPatch(`/api/leads/${id}`, data)
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['lead', id] })
      const previousLead = queryClient.getQueryData(['lead', id])
      
      queryClient.setQueryData(['lead', id], (old: any) => {
        if (!old) return old
        return { ...old, ...data }
      })

      return { previousLead }
    },
    onError: (err, variables, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', id], context.previousLead)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  return {
    lead: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateLead: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  }
}

