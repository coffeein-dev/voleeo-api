use crate::status::status;
use crate::{git_err, open_repo};
use git2::{build::CheckoutBuilder, ObjectType, Repository};
use std::collections::HashSet;
use std::path::Path;
use voleeo_core::VoleeoError;

pub fn stage(path: &Path, files: &[String]) -> Result<(), VoleeoError> {
    let repo = open_repo(path)?;
    let mut index = repo.index().map_err(git_err)?;
    for f in files {
        let rel = Path::new(f);
        if path.join(f).exists() {
            index.add_path(rel).map_err(git_err)?;
        } else {
            index.remove_path(rel).map_err(git_err)?;
        }
    }
    index.write().map_err(git_err)?;
    Ok(())
}

pub fn stage_all(path: &Path) -> Result<(), VoleeoError> {
    // Stage only the changes `status` reports — so volatile (timestamp-only)
    // files stay hidden and don't get committed.
    let unstaged: HashSet<String> = status(path)?
        .files
        .into_iter()
        .filter(|f| !f.staged)
        .map(|f| f.path)
        .collect();

    let repo = open_repo(path)?;
    let mut index = repo.index().map_err(git_err)?;
    for f in &unstaged {
        let rel = Path::new(f);
        if path.join(f).exists() {
            index.add_path(rel).map_err(git_err)?;
        } else {
            index.remove_path(rel).map_err(git_err)?;
        }
    }
    index.write().map_err(git_err)?;
    Ok(())
}

pub fn unstage(path: &Path, files: &[String]) -> Result<(), VoleeoError> {
    let repo = open_repo(path)?;
    match repo.head() {
        Ok(head) => {
            let obj = head.peel(ObjectType::Commit).map_err(git_err)?;
            repo.reset_default(Some(&obj), files.iter().map(|s| s.as_str()))
                .map_err(git_err)?;
        }
        Err(_) => {
            // Unborn HEAD: there's no tree to reset to, so just drop from the index.
            let mut index = repo.index().map_err(git_err)?;
            for f in files {
                index.remove_path(Path::new(f)).ok();
            }
            index.write().map_err(git_err)?;
        }
    }
    Ok(())
}

pub fn unstage_all(path: &Path) -> Result<(), VoleeoError> {
    let repo = open_repo(path)?;
    match repo.head() {
        Ok(head) => {
            let obj = head.peel(ObjectType::Commit).map_err(git_err)?;
            repo.reset_default(Some(&obj), ["*"].iter().copied())
                .map_err(git_err)?;
        }
        Err(_) => {
            let mut index = repo.index().map_err(git_err)?;
            index.clear().map_err(git_err)?;
            index.write().map_err(git_err)?;
        }
    }
    Ok(())
}

/// Revert worktree changes: tracked files restored from HEAD, untracked files deleted.
pub fn discard(path: &Path, files: &[String]) -> Result<(), VoleeoError> {
    let repo = open_repo(path)?;
    // With an unborn HEAD nothing is tracked yet — every listed file is untracked.
    if repo.head().is_ok() {
        let mut co = CheckoutBuilder::new();
        co.force();
        for f in files {
            co.path(f.as_str());
        }
        repo.checkout_head(Some(&mut co)).map_err(git_err)?;
    }
    for f in files {
        if !in_head(&repo, f) {
            std::fs::remove_file(path.join(f)).ok();
        }
    }
    Ok(())
}

fn in_head(repo: &Repository, rel: &str) -> bool {
    repo.head()
        .ok()
        .and_then(|h| h.peel_to_tree().ok())
        .and_then(|t| t.get_path(Path::new(rel)).ok())
        .is_some()
}
