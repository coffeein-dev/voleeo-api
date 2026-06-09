use crate::VoleeoError;

pub trait SecretStore {
    fn get_secret(&self, key: &str) -> Result<Option<String>, VoleeoError>;
    fn set_secret(&self, key: &str, value: &str) -> Result<(), VoleeoError>;
    fn delete_secret(&self, key: &str) -> Result<(), VoleeoError>;
}
