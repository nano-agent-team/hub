import fs from 'fs';
import path from 'path';

export interface RepoState {
  prs_since: string;
  issues_since: string;
}

export interface PollerState {
  repos: Record<string, RepoState>;
}

export class StateManager {
  private filePath: string;
  private state: PollerState;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'teams', 'github-team', 'state.json');
    this.state = this.load();
  }

  private load(): PollerState {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) as PollerState;
    } catch {
      return { repos: {} };
    }
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }

  getRepoCursor(repo: string): RepoState {
    if (!this.state.repos[repo]) {
      const now = new Date().toISOString();
      this.state.repos[repo] = { prs_since: now, issues_since: now };
      this.save();
    }
    return this.state.repos[repo];
  }

  updateRepoCursor(repo: string, updates: Partial<RepoState>): void {
    this.state.repos[repo] = { ...this.getRepoCursor(repo), ...updates };
    this.save();
  }
}
