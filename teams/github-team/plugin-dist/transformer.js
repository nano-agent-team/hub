export function prToNats(repo, pr, eventType, ghToken) {
    const topic = eventType === 'opened' ? 'topic.github.pr.opened' : 'topic.github.pr.synchronized';
    const [owner, repoName] = repo.split('/');
    return {
        topic,
        payload: {
            repo,
            pr_number: pr.number,
            title: pr.title,
            author: pr.user.login,
            base_branch: pr.base.ref,
            head_branch: pr.head.ref,
            sha: pr.head.sha,
            url: pr.html_url,
            replySubject: `github.pr.reply.${owner}.${repoName}.${pr.number}`,
            ...(ghToken ? { gh_token: ghToken } : {}),
        },
    };
}
export function issueToNats(repo, issue, ghToken) {
    return {
        topic: 'topic.github.issue.opened',
        payload: {
            repo,
            issue_number: issue.number,
            title: issue.title,
            body: issue.body,
            author: issue.user.login,
            url: issue.html_url,
            ...(ghToken ? { gh_token: ghToken } : {}),
        },
    };
}
export function prDiscussionToNats(repo, pr, comment, ghToken) {
    return {
        topic: 'topic.github.pr.discussion',
        payload: {
            repo,
            pr_number: pr.number,
            title: pr.title,
            author: pr.user.login,
            base_branch: pr.base.ref,
            head_branch: pr.head.ref,
            sha: pr.head.sha,
            url: pr.html_url,
            comment_id: comment.id,
            comment_author: comment.user.login,
            comment_body: comment.body,
            comment_url: comment.html_url,
            ...(ghToken ? { gh_token: ghToken } : {}),
        },
    };
}
export function commentToNats(repo, issueNumber, comment, ghToken) {
    return {
        topic: 'topic.github.issue.comment',
        payload: {
            repo,
            issue_number: issueNumber,
            comment_id: comment.id,
            body: comment.body,
            author: comment.user.login,
            url: comment.html_url,
            ...(ghToken ? { gh_token: ghToken } : {}),
        },
    };
}
//# sourceMappingURL=transformer.js.map