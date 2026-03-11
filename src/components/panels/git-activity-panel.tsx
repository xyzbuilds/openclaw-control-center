'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

interface GitCommit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  timestamp: number
  subject: string
  body: string
  filesChanged: number
  insertions: number
  deletions: number
}

interface GitActivityData {
  commits: GitCommit[]
  count: number
  branch: string
  repoName: string
  path: string
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(timestamp * 1000).toLocaleDateString()
}

export function GitActivityPanel() {
  const [data, setData] = useState<GitActivityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [filterAuthor, setFilterAuthor] = useState('all')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/git-activity?limit=100')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to load' }))
        setError(err.error || 'Failed to load git activity')
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Network error loading git activity')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (isLoading && !data) {
    return <Loader variant="panel" label="Loading git activity" />
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Git Activity</h1>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadData} variant="secondary" size="sm">Retry</Button>
        </div>
      </div>
    )
  }

  if (!data || data.commits.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Git Activity</h1>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-lg text-muted-foreground mb-2">No git history found</p>
          <p className="text-sm text-muted-foreground">Commits will appear here once agents start building.</p>
        </div>
      </div>
    )
  }

  const authors = [...new Set(data.commits.map(c => c.author))]
  const filtered = filterAuthor === 'all' ? data.commits : data.commits.filter(c => c.author === filterAuthor)

  // Group commits by date
  const grouped = new Map<string, GitCommit[]>()
  for (const commit of filtered) {
    const dateKey = new Date(commit.timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(commit)
  }

  // Summary stats
  const totalInsertions = filtered.reduce((s, c) => s + c.insertions, 0)
  const totalDeletions = filtered.reduce((s, c) => s + c.deletions, 0)
  const totalFiles = filtered.reduce((s, c) => s + c.filesChanged, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Git Activity</h1>
            <p className="text-muted-foreground mt-1">
              Recent commits in <span className="font-mono text-foreground">{data.repoName}</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-secondary text-xs font-mono">{data.branch}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)}
              className="h-8 px-2 rounded-lg bg-secondary border border-border text-foreground text-xs">
              <option value="all">All Authors ({authors.length})</option>
              {authors.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <Button onClick={loadData} variant="secondary" size="sm" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{filtered.length}</div>
          <div className="text-xs text-muted-foreground">Commits</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{authors.length}</div>
          <div className="text-xs text-muted-foreground">Contributors</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{totalFiles}</div>
          <div className="text-xs text-muted-foreground">Files Changed</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">+{totalInsertions.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Insertions</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">-{totalDeletions.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Deletions</div>
        </div>
      </div>

      {/* Commit timeline */}
      <div className="space-y-6">
        {[...grouped.entries()].map(([date, commits]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground px-2">{date}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {commits.map(commit => {
                const isExpanded = expandedCommit === commit.hash
                return (
                  <div key={commit.hash}
                    className="bg-card border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => setExpandedCommit(isExpanded ? null : commit.hash)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                            {commit.shortHash}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{commit.subject}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{commit.author}</span>
                              <span>·</span>
                              <span>{timeAgo(commit.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          {commit.filesChanged > 0 && (
                            <span className="text-muted-foreground">{commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}</span>
                          )}
                          {commit.insertions > 0 && (
                            <span className="text-green-400">+{commit.insertions}</span>
                          )}
                          {commit.deletions > 0 && (
                            <span className="text-red-400">-{commit.deletions}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded && commit.body && (
                      <div className="px-4 pb-4 pt-0 border-t border-border/50">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2 font-mono">{commit.body.trim()}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
