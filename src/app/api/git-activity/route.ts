import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { execSync } from 'child_process'
import path from 'path'

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

/**
 * GET /api/git-activity — List recent git commits from the workspace
 * Query params:
 *   - limit: max commits to return (default 50, max 200)
 *   - path: workspace path (defaults to CWD or configured workspace)
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)
  const workspacePath = searchParams.get('path') || process.cwd()

  try {
    // Verify it's a git repo
    const resolvedPath = path.resolve(workspacePath)
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: resolvedPath, encoding: 'utf-8', timeout: 5000 })
    } catch {
      return NextResponse.json({ error: 'Not a git repository', path: resolvedPath }, { status: 400 })
    }

    // Get commits with stats
    const separator = '---GIT-COMMIT-SEP---'
    const format = `%H${separator}%h${separator}%an${separator}%ae${separator}%aI${separator}%at${separator}%s${separator}%b`
    const logOutput = execSync(
      `git log --format="${format}" --shortstat -n ${limit}`,
      { cwd: resolvedPath, encoding: 'utf-8', timeout: 15000, maxBuffer: 1024 * 1024 }
    ).trim()

    if (!logOutput) {
      return NextResponse.json({ commits: [], count: 0, path: resolvedPath })
    }

    const commits: GitCommit[] = []
    const lines = logOutput.split('\n')
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      if (!line.includes(separator)) { i++; continue }

      const parts = line.split(separator)
      if (parts.length < 7) { i++; continue }

      let filesChanged = 0, insertions = 0, deletions = 0
      // Next non-empty line after the commit line might be the stat line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1]?.trim()
        if (nextLine && !nextLine.includes(separator)) {
          const fileMatch = nextLine.match(/(\d+) files? changed/)
          const insMatch = nextLine.match(/(\d+) insertions?/)
          const delMatch = nextLine.match(/(\d+) deletions?/)
          if (fileMatch) filesChanged = Number(fileMatch[1])
          if (insMatch) insertions = Number(insMatch[1])
          if (delMatch) deletions = Number(delMatch[1])
          i++ // skip the stat line
        }
      }

      commits.push({
        hash: parts[0],
        shortHash: parts[1],
        author: parts[2],
        email: parts[3],
        date: parts[4],
        timestamp: Number(parts[5]),
        subject: parts[6],
        body: parts[7] || '',
        filesChanged,
        insertions,
        deletions,
      })
      i++
    }

    // Get current branch
    let branch = 'unknown'
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: resolvedPath, encoding: 'utf-8', timeout: 5000 }).trim()
    } catch { /* ignore */ }

    // Get repo name
    let repoName = path.basename(resolvedPath)
    try {
      const remoteUrl = execSync('git remote get-url origin', { cwd: resolvedPath, encoding: 'utf-8', timeout: 5000 }).trim()
      const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/)
      if (match) repoName = match[1]
    } catch { /* ignore */ }

    return NextResponse.json({
      commits,
      count: commits.length,
      branch,
      repoName,
      path: resolvedPath,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read git log'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
