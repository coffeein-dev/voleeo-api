use std::collections::HashMap;
use std::path::{Path, PathBuf};
use voleeo_core::VoleeoError;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub struct SecretStore {
    path: PathBuf,
    data: HashMap<String, String>,
}

impl SecretStore {
    pub fn new(app_data_dir: impl AsRef<Path>) -> Result<Self, VoleeoError> {
        let path = app_data_dir.as_ref().join("secrets.json");
        let data = if path.exists() {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            HashMap::new()
        };
        Ok(Self { path, data })
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.data.get(key).map(String::as_str)
    }

    pub fn set(&mut self, key: String, value: String) -> Result<(), VoleeoError> {
        self.data.insert(key, value);
        self.persist()
    }

    pub fn remove(&mut self, key: &str) -> Result<(), VoleeoError> {
        self.data.remove(key);
        self.persist()
    }

    /// Encrypt `plaintext` with `enc_key` (AES-256-GCM) and store the ciphertext blob.
    /// Use this when `workspace.encrypted == true`.
    pub fn set_encrypted(
        &mut self,
        key: String,
        plaintext: &str,
        enc_key: &[u8; 32],
    ) -> Result<(), VoleeoError> {
        let blob = voleeo_crypto::encrypt(plaintext, enc_key)?;
        self.set(key, blob)
    }

    /// Retrieve and decrypt a value stored with `set_encrypted`.
    /// Returns `None` if the key is absent or the value is not a recognised encrypted blob.
    pub fn get_decrypted(&self, key: &str, enc_key: &[u8; 32]) -> Option<String> {
        let raw = self.get(key)?;
        voleeo_crypto::decrypt(raw, enc_key).ok()
    }

    fn persist(&self) -> Result<(), VoleeoError> {
        let json = serde_json::to_string_pretty(&self.data)
            .map_err(|e| VoleeoError::Storage(e.to_string()))?;
        std::fs::write(&self.path, json).map_err(|e| VoleeoError::Storage(e.to_string()))?;
        #[cfg(unix)]
        {
            let _ = std::fs::set_permissions(&self.path, std::fs::Permissions::from_mode(0o600));
        }
        Ok(())
    }
}
