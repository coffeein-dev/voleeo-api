/// AES-256-GCM authenticated encryption primitives.
///
/// Encrypted value format: `enc:v1:<hex(nonce || ciphertext || tag)>`
/// - nonce: 12 bytes (random per call)
/// - tag:   16 bytes (appended by aes-gcm's AEAD)
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use rand::Rng;
use voleeo_core::VoleeoError;

const NONCE_LEN: usize = 12;
const ENC_PREFIX: &str = "enc:v1:";

pub(crate) fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02X}")).collect()
}

pub(crate) fn from_hex(s: &str) -> Result<Vec<u8>, VoleeoError> {
    if !s.len().is_multiple_of(2) {
        return Err(VoleeoError::Crypto(format!(
            "invalid hex length: {}",
            s.len()
        )));
    }
    (0..s.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&s[i..i + 2], 16)
                .map_err(|_| VoleeoError::Crypto(format!("invalid hex char at {i}")))
        })
        .collect()
}

/// Encrypt a plaintext string and return `enc:v1:<hex(nonce+ciphertext+tag)>`.
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<String, VoleeoError> {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from(nonce_bytes);

    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| VoleeoError::Crypto(format!("encryption failed: {e}")))?;

    // Blob = nonce (12) || ciphertext || tag (16, appended by aes-gcm)
    let mut blob = nonce_bytes.to_vec();
    blob.extend_from_slice(&ciphertext);

    Ok(format!("{ENC_PREFIX}{}", to_hex(&blob)))
}

/// Decrypt a value produced by `encrypt`. Returns `Err` if the value is not
/// an `enc:v1:` blob, or if decryption fails (wrong key, tampered data).
pub fn decrypt(ciphertext: &str, key: &[u8; 32]) -> Result<String, VoleeoError> {
    let hex_blob = ciphertext.strip_prefix(ENC_PREFIX).ok_or_else(|| {
        VoleeoError::Crypto("not an encrypted value (missing enc:v1: prefix)".into())
    })?;

    let blob = from_hex(hex_blob)?;
    if blob.len() < NONCE_LEN + 16 {
        // minimum: 12-byte nonce + 16-byte GCM tag (empty plaintext)
        return Err(VoleeoError::Crypto("ciphertext too short".into()));
    }

    let nonce = Nonce::from_slice(&blob[..NONCE_LEN]);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let plaintext = cipher.decrypt(nonce, &blob[NONCE_LEN..]).map_err(|_| {
        VoleeoError::Crypto("decryption failed — wrong key or tampered data".into())
    })?;

    String::from_utf8(plaintext)
        .map_err(|e| VoleeoError::Crypto(format!("decrypted bytes are not valid UTF-8: {e}")))
}

pub fn is_encrypted(value: &str) -> bool {
    value.starts_with(ENC_PREFIX)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ZERO_KEY: [u8; 32] = [0u8; 32];

    #[test]
    fn to_hex_known_values() {
        assert_eq!(to_hex(&[0x00, 0xff, 0xab]), "00FFAB");
        assert_eq!(to_hex(&[]), "");
    }

    #[test]
    fn from_hex_roundtrip() {
        let input = vec![0x00u8, 0xff, 0x12, 0xab];
        assert_eq!(from_hex(&to_hex(&input)).unwrap(), input);
    }

    #[test]
    fn from_hex_odd_length_fails() {
        assert!(from_hex("ABC").is_err());
    }

    #[test]
    fn from_hex_invalid_chars_fail() {
        assert!(from_hex("GG").is_err());
        assert!(from_hex("ZZ").is_err());
    }

    #[test]
    fn is_encrypted_checks_prefix() {
        assert!(is_encrypted("enc:v1:DEADBEEF"));
        assert!(!is_encrypted("plaintext"));
        assert!(!is_encrypted("enc:v2:other")); // wrong version prefix
        assert!(!is_encrypted(""));
    }

    #[test]
    fn encrypt_produces_enc_prefix() {
        let result = encrypt("hello", &ZERO_KEY).unwrap();
        assert!(result.starts_with("enc:v1:"));
    }

    #[test]
    fn encrypt_uses_random_nonce_per_call() {
        let a = encrypt("same plaintext", &ZERO_KEY).unwrap();
        let b = encrypt("same plaintext", &ZERO_KEY).unwrap();
        assert_ne!(
            a, b,
            "random nonce must produce different ciphertext each call"
        );
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let plaintext = "secret value 🔐";
        let encrypted = encrypt(plaintext, &ZERO_KEY).unwrap();
        assert_eq!(decrypt(&encrypted, &ZERO_KEY).unwrap(), plaintext);
    }

    #[test]
    fn encrypt_decrypt_empty_string() {
        let encrypted = encrypt("", &ZERO_KEY).unwrap();
        assert_eq!(decrypt(&encrypted, &ZERO_KEY).unwrap(), "");
    }

    #[test]
    fn decrypt_wrong_key_fails() {
        let encrypted = encrypt("secret", &ZERO_KEY).unwrap();
        let wrong_key = [1u8; 32];
        assert!(decrypt(&encrypted, &wrong_key).is_err());
    }

    #[test]
    fn decrypt_tampered_tag_fails() {
        let encrypted = encrypt("secret", &ZERO_KEY).unwrap();
        // Flip the last hex digit to corrupt the GCM authentication tag.
        let mut tampered = encrypted.clone();
        let last = tampered.pop().unwrap();
        tampered.push(if last == 'A' { 'B' } else { 'A' });
        assert!(decrypt(&tampered, &ZERO_KEY).is_err());
    }

    #[test]
    fn decrypt_missing_prefix_fails() {
        assert!(decrypt("not-an-encrypted-value", &ZERO_KEY).is_err());
    }

    #[test]
    fn decrypt_too_short_fails() {
        // enc:v1: prefix + fewer than (12 nonce + 16 tag) * 2 hex chars = 56 chars
        assert!(decrypt("enc:v1:DEADBEEF", &ZERO_KEY).is_err());
    }
}
