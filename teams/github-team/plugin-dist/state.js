import fs from 'fs';
import path from 'path';
export class StateManager {
    filePath;
    state;
    constructor(dataDir) {
        this.filePath = path.join(dataDir, 'teams', 'github-team', 'state.json');
        this.state = this.load();
    }
    load() {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return { repos: {} };
        }
    }
    save() {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    }
    getRepoCursor(repo) {
        if (!this.state.repos[repo]) {
            const now = new Date().toISOString();
            this.state.repos[repo] = { prs_since: now, issues_since: now };
            this.save();
        }
        return this.state.repos[repo];
    }
    updateRepoCursor(repo, updates) {
        this.state.repos[repo] = { ...this.getRepoCursor(repo), ...updates };
        this.save();
    }
}
//# sourceMappingURL=state.js.map