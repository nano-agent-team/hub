export function prToNats(repo, pr, eventType) {
    const topic = eventType === 'opened' ? 'topic.github.pr.opened' : 'topic.github.pr.synchronized';
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
        },
    };
}
export function issueToNats(repo, issue) {
    return {
        topic: 'topic.github.issue.opened',
        payload: {
            repo,
            issue_number: issue.number,
            title: issue.title,
            body: issue.body,
            author: issue.user.login,
            url: issue.html_url,
        },
    };
}
export function commentToNats(repo, issueNumber, comment) {
    return {
        topic: 'topic.github.issue.comment',
        payload: {
            repo,
            issue_number: issueNumber,
            comment_id: comment.id,
            body: comment.body,
            author: comment.user.login,
            url: comment.html_url,
        },
    };
}
//# sourceMappingURL=transformer.js.map