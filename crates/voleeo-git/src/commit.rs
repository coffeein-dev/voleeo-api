use crate::git_err;
use crate::log::to_commit;
use crate::open_repo;
use git2::{Commit, Repository, Signature};
use std::path::Path;
use voleeo_core::{GitCommit, VoleeoError};

pub fn commit(
    path: &Path,
    message: &str,
    author: Option<(String, String)>,
) -> Result<GitCommit, VoleeoError> {
    let repo = open_repo(path)?;
    write_commit(&repo, message, author, false)
}

/// Build a commit from the current index. When `merge` is true, MERGE_HEAD is
/// included as a second parent and the merge state is cleared afterwards.
pub(crate) fn write_commit(
    repo: &Repository,
    message: &str,
    author: Option<(String, String)>,
    merge: bool,
) -> Result<GitCommit, VoleeoError> {
    let sig = signature(repo, author)?;
    let mut index = repo.index().map_err(git_err)?;
    let tree_oid = index.write_tree().map_err(git_err)?;
    let tree = repo.find_tree(tree_oid).map_err(git_err)?;

    let mut parents: Vec<Commit> = Vec::new();
    if let Ok(head) = repo.head() {
        if let Ok(c) = head.peel_to_commit() {
            parents.push(c);
        }
    }
    if merge {
        if let Ok(merge_head) = repo.find_reference("MERGE_HEAD") {
            if let Some(oid) = merge_head.target() {
                if let Ok(c) = repo.find_commit(oid) {
                    parents.push(c);
                }
            }
        }
    }

    let parent_refs: Vec<&Commit> = parents.iter().collect();
    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)
        .map_err(git_err)?;

    if merge {
        repo.cleanup_state().map_err(git_err)?;
    }
    let commit = repo.find_commit(oid).map_err(git_err)?;
    Ok(to_commit(&commit))
}

fn signature(
    repo: &Repository,
    author: Option<(String, String)>,
) -> Result<Signature<'static>, VoleeoError> {
    match author {
        Some((name, email)) => Signature::now(&name, &email).map_err(git_err),
        None => repo.signature().map_err(|_| {
            VoleeoError::Git(
                "no commit author configured — set user.name and user.email".to_string(),
            )
        }),
    }
}
