import type { ReferenceEntry } from "../../components/ReferenceBrowser.svelte";

export const gitCommands: ReferenceEntry[] = [
  { id: "init", title: "git init", category: "Setup", body: "Create a new local repository in the current directory.", tags: ["setup"] },
  { id: "clone", title: "git clone <url>", category: "Setup", body: "Copy a remote repository (and its full history) to a new local directory.", tags: ["setup"] },
  { id: "status", title: "git status", category: "Basics", body: "Show staged, unstaged, and untracked changes.", tags: ["basics"] },
  { id: "add", title: "git add <path>", category: "Basics", body: "Stage changes in <path> for the next commit. Use 'git add .' to stage everything.", tags: ["basics"] },
  { id: "commit", title: "git commit -m \"msg\"", category: "Basics", body: "Record staged changes as a new commit.", tags: ["basics"] },
  { id: "diff", title: "git diff", category: "Basics", body: "Show unstaged changes. 'git diff --staged' shows staged changes vs. the last commit.", tags: ["basics"] },
  { id: "log", title: "git log --oneline --graph", category: "Basics", body: "Compact, graphical commit history.", tags: ["history"] },
  { id: "show", title: "git show <commit>", category: "Basics", body: "Show the diff introduced by a single commit.", tags: ["history"] },
  { id: "blame", title: "git blame <file>", category: "Basics", body: "Show who last modified each line of a file, and in which commit.", tags: ["history"] },

  { id: "branch", title: "git branch", category: "Branching", body: "List local branches. 'git branch <name>' creates one.", tags: ["branch"] },
  { id: "checkout-b", title: "git checkout -b <name>", category: "Branching", body: "Create and switch to a new branch. Modern equivalent: 'git switch -c <name>'.", tags: ["branch"] },
  { id: "switch", title: "git switch <branch>", category: "Branching", body: "Switch to an existing branch.", tags: ["branch"] },
  { id: "merge", title: "git merge <branch>", category: "Branching", body: "Merge <branch> into the current branch, creating a merge commit if needed.", tags: ["branch"] },
  { id: "branch-d", title: "git branch -d <name>", category: "Branching", body: "Delete a branch that's already merged. Use -D to force-delete.", tags: ["branch"] },

  { id: "rebase", title: "git rebase <branch>", category: "Rebase", body: "Replay the current branch's commits on top of <branch>, producing a linear history.", tags: ["rebase"] },
  { id: "rebase-i", title: "git rebase -i <commit>", category: "Rebase", body: "Interactively reorder, squash, edit, or drop commits since <commit>.", tags: ["rebase"] },
  { id: "rebase-abort", title: "git rebase --abort", category: "Rebase", body: "Cancel an in-progress rebase and return to the pre-rebase state.", tags: ["rebase"] },
  { id: "cherry-pick", title: "git cherry-pick <commit>", category: "Rebase", body: "Apply the changes from a single commit onto the current branch.", tags: ["rebase"] },

  { id: "fetch", title: "git fetch", category: "Remote", body: "Download objects and refs from a remote without merging.", tags: ["remote"] },
  { id: "pull", title: "git pull", category: "Remote", body: "Fetch and merge (or rebase, with --rebase) the remote tracking branch.", tags: ["remote"] },
  { id: "push", title: "git push", category: "Remote", body: "Upload local commits to the remote tracking branch." , tags: ["remote"]},
  { id: "push-u", title: "git push -u origin <branch>", category: "Remote", body: "Push and set up tracking for a new branch.", tags: ["remote"] },
  { id: "remote-v", title: "git remote -v", category: "Remote", body: "List configured remotes and their URLs.", tags: ["remote"] },

  { id: "reset-soft", title: "git reset --soft HEAD~1", category: "Undo", body: "Undo the last commit, keep changes staged.", tags: ["undo"] },
  { id: "reset-mixed", title: "git reset HEAD~1", category: "Undo", body: "Undo the last commit, keep changes unstaged (default mode).", tags: ["undo"] },
  { id: "reset-hard", title: "git reset --hard <commit>", category: "Undo", body: "Discard all changes since <commit>. Destructive — uncommitted work is lost.", tags: ["undo", "destructive"] },
  { id: "revert", title: "git revert <commit>", category: "Undo", body: "Create a new commit that undoes <commit>, without rewriting history. Safe for shared branches.", tags: ["undo"] },
  { id: "checkout-file", title: "git checkout -- <file>", category: "Undo", body: "Discard unstaged changes to a file. Modern equivalent: 'git restore <file>'.", tags: ["undo"] },
  { id: "clean", title: "git clean -fd", category: "Undo", body: "Remove untracked files and directories. Destructive — use -n first to preview.", tags: ["undo", "destructive"] },

  { id: "stash", title: "git stash", category: "Stash", body: "Save uncommitted changes and revert the working directory to HEAD.", tags: ["stash"] },
  { id: "stash-pop", title: "git stash pop", category: "Stash", body: "Reapply the most recent stash and remove it from the stash list.", tags: ["stash"] },
  { id: "stash-list", title: "git stash list", category: "Stash", body: "List all stashed changesets.", tags: ["stash"] },
  { id: "stash-u", title: "git stash -u", category: "Stash", body: "Stash including untracked files.", tags: ["stash"] },

  { id: "tag", title: "git tag <name>", category: "Tags", body: "Create a lightweight tag at the current commit. Use -a for an annotated tag.", tags: ["tags"] },
  { id: "tag-push", title: "git push origin <tag>", category: "Tags", body: "Push a single tag to the remote. Use --tags to push all tags.", tags: ["tags"] },
];
