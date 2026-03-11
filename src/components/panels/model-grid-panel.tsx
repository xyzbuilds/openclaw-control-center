'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

interface ModelEntry {
  name: string
  provider: string
  inputPerMTok: number
  outputPerMTok: number
  contextWindow: string
  capabilities: string[]
  tier: 'free' | 'budget' | 'standard' | 'premium'
  status: 'available' | 'limited' | 'unknown'
  usageTokens?: number
  usageCost?: number
  requestCount?: number
}

// Static model registry — enriched with known capabilities
const MODEL_REGISTRY: ModelEntry[] = [
  {
    name: 'claude-opus-4-6', provider: 'Anthropic', inputPerMTok: 15.0, outputPerMTok: 75.0,
    contextWindow: '200K', capabilities: ['coding', 'reasoning', 'vision', 'tool-use', 'long-context'],
    tier: 'premium', status: 'available',
  },
  {
    name: 'claude-sonnet-4-6', provider: 'Anthropic', inputPerMTok: 3.0, outputPerMTok: 15.0,
    contextWindow: '200K', capabilities: ['coding', 'reasoning', 'vision', 'tool-use', 'long-context'],
    tier: 'standard', status: 'available',
  },
  {
    name: 'claude-haiku-4-5', provider: 'Anthropic', inputPerMTok: 0.8, outputPerMTok: 4.0,
    contextWindow: '200K', capabilities: ['coding', 'reasoning', 'vision', 'tool-use'],
    tier: 'budget', status: 'available',
  },
  {
    name: 'llama-3.3-70b-versatile', provider: 'Groq', inputPerMTok: 0.59, outputPerMTok: 0.59,
    contextWindow: '128K', capabilities: ['coding', 'reasoning', 'tool-use'],
    tier: 'budget', status: 'available',
  },
  {
    name: 'llama-3.1-8b-instant', provider: 'Groq', inputPerMTok: 0.05, outputPerMTok: 0.05,
    contextWindow: '128K', capabilities: ['coding', 'reasoning'],
    tier: 'budget', status: 'available',
  },
  {
    name: 'kimi-k2.5', provider: 'Moonshot', inputPerMTok: 1.0, outputPerMTok: 1.0,
    contextWindow: '128K', capabilities: ['coding', 'reasoning'],
    tier: 'standard', status: 'available',
  },
  {
    name: 'minimax-m2.1', provider: 'MiniMax', inputPerMTok: 0.3, outputPerMTok: 0.3,
    contextWindow: '128K', capabilities: ['coding', 'reasoning'],
    tier: 'budget', status: 'available',
  },
  {
    name: 'deepseek-r1:14b', provider: 'Ollama (Local)', inputPerMTok: 0, outputPerMTok: 0,
    contextWindow: '32K', capabilities: ['coding', 'reasoning'],
    tier: 'free', status: 'available',
  },
  {
    name: 'qwen2.5-coder:14b', provider: 'Ollama (Local)', inputPerMTok: 0, outputPerMTok: 0,
    contextWindow: '32K', capabilities: ['coding'],
    tier: 'free', status: 'available',
  },
]

const formatCost = (cost: number) => cost === 0 ? 'Free' : `$${cost.toFixed(2)}`

const tierColors: Record<string, string> = {
  free: 'bg-green-500/10 text-green-400 border-green-500/20',
  budget: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  standard: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  premium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const capabilityIcons: Record<string, string> = {
  coding: '{ }',
  reasoning: '🧠',
  vision: '👁',
  'tool-use': '🔧',
  'long-context': '📄',
}

type SortKey = 'name' | 'provider' | 'input-cost' | 'output-cost' | 'tier'
type ViewMode = 'grid' | 'table'

export function ModelGridPanel() {
  const [models, setModels] = useState<ModelEntry[]>(MODEL_REGISTRY)
  const [sortKey, setSortKey] = useState<SortKey>('tier')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Try to enrich with actual usage data
  const enrichWithUsage = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/tokens?action=stats&timeframe=month')
      if (res.ok) {
        const data = await res.json()
        if (data?.models) {
          setModels(prev => prev.map(m => {
            // Match by short name
            const usageEntry = Object.entries(data.models).find(([key]) =>
              key.includes(m.name) || m.name.includes(key.split('/').pop() || '')
            )
            if (usageEntry) {
              const [, stats] = usageEntry as [string, { totalTokens: number; totalCost: number; requestCount: number }]
              return { ...m, usageTokens: stats.totalTokens, usageCost: stats.totalCost, requestCount: stats.requestCount }
            }
            return m
          }))
        }
      }
    } catch {
      // silently fail — usage data is optional
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { enrichWithUsage() }, [enrichWithUsage])

  const providers = [...new Set(models.map(m => m.provider))]

  const sorted = [...models]
    .filter(m => filterTier === 'all' || m.tier === filterTier)
    .filter(m => filterProvider === 'all' || m.provider === filterProvider)
    .sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name)
        case 'provider': return a.provider.localeCompare(b.provider)
        case 'input-cost': return a.inputPerMTok - b.inputPerMTok
        case 'output-cost': return a.outputPerMTok - b.outputPerMTok
        case 'tier': {
          const order = { free: 0, budget: 1, standard: 2, premium: 3 }
          return order[a.tier] - order[b.tier]
        }
        default: return 0
      }
    })

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toString()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Model Grid</h1>
            <p className="text-muted-foreground mt-1">Available models with capabilities, pricing, and usage</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['grid', 'table'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === v ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v === 'grid' ? 'Grid' : 'Table'}
                </button>
              ))}
            </div>
            {/* Filters */}
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              className="h-8 px-2 rounded-lg bg-secondary border border-border text-foreground text-xs">
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="budget">Budget</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
            <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
              className="h-8 px-2 rounded-lg bg-secondary border border-border text-foreground text-xs">
              <option value="all">All Providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button onClick={enrichWithUsage} variant="secondary" size="sm" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {isLoading && models.length === 0 ? (
        <Loader variant="panel" label="Loading model data" />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(model => (
            <div key={model.name} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{model.name}</h3>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tierColors[model.tier]}`}>
                  {model.tier}
                </span>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {model.capabilities.map(cap => (
                  <span key={cap} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground flex items-center gap-1">
                    <span>{capabilityIcons[cap] || '•'}</span> {cap}
                  </span>
                ))}
              </div>

              {/* Pricing + Context */}
              <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/50 pt-3">
                <div>
                  <div className="text-muted-foreground">Input</div>
                  <div className="font-medium text-foreground">{formatCost(model.inputPerMTok)}/M</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Output</div>
                  <div className="font-medium text-foreground">{formatCost(model.outputPerMTok)}/M</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Context</div>
                  <div className="font-medium text-foreground">{model.contextWindow}</div>
                </div>
              </div>

              {/* Usage stats if available */}
              {model.usageTokens !== undefined && model.usageTokens > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Tokens Used</div>
                    <div className="font-medium text-cyan-400">{formatNumber(model.usageTokens)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Cost</div>
                    <div className="font-medium text-cyan-400">${model.usageCost?.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Requests</div>
                    <div className="font-medium text-cyan-400">{model.requestCount}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {([
                    ['name', 'Model'],
                    ['provider', 'Provider'],
                    ['tier', 'Tier'],
                    ['input-cost', 'Input $/M'],
                    ['output-cost', 'Output $/M'],
                  ] as const).map(([key, label]) => (
                    <th key={key} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => setSortKey(key)}>
                      {label} {sortKey === key && '▼'}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Context</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Capabilities</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Usage</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(model => (
                  <tr key={model.name} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{model.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{model.provider}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tierColors[model.tier]}`}>
                        {model.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatCost(model.inputPerMTok)}</td>
                    <td className="px-4 py-3">{formatCost(model.outputPerMTok)}</td>
                    <td className="px-4 py-3">{model.contextWindow}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {model.capabilities.map(cap => (
                          <span key={cap} className="px-1 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {model.usageTokens ? `${formatNumber(model.usageTokens)} tok` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total Models</div>
            <div className="text-lg font-bold text-foreground">{sorted.length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Providers</div>
            <div className="text-lg font-bold text-foreground">{new Set(sorted.map(m => m.provider)).size}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cheapest Input</div>
            <div className="text-lg font-bold text-green-400">
              {sorted.length > 0 ? formatCost(Math.min(...sorted.map(m => m.inputPerMTok))) + '/M' : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Most Expensive</div>
            <div className="text-lg font-bold text-amber-400">
              {sorted.length > 0 ? formatCost(Math.max(...sorted.map(m => m.outputPerMTok))) + '/M' : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
