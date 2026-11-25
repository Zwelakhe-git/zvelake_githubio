package auth

import (
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	iterations = 600_000 // OWASP recommendation for PBKDF2-HMAC-SHA256
	saltLen    = 16
	keyLen     = 32
	tokenTTL   = 24 * time.Hour
)

var ErrInvalidToken = errors.New("invalid token")

// HashPassword returns "saltHex:hashHex".
func HashPassword(password string) (string, error) {
	salt := make([]byte, saltLen)
	rand.Read(salt)

	hash, err := pbkdf2.Key(sha256.New, password, salt, iterations, keyLen)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s:%s", hex.EncodeToString(salt), hex.EncodeToString(hash)), nil
}

// VerifyPassword hashes password with the salt from stored and compares.
func VerifyPassword(password string, stored string) (bool, error) {
	saltHex, hashHex, found := strings.Cut(stored, ":")
	if !found {
		return false, errors.New("stored password has wrong format")
	}
	salt, err := hex.DecodeString(saltHex)
	if err != nil {
		return false, err
	}
	expected, err := hex.DecodeString(hashHex)
	if err != nil {
		return false, err
	}

	actual, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(expected))
	if err != nil {
		return false, err
	}
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}

func b64url(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func sign(data string) string {
	mac := hmac.New(sha256.New, []byte(os.Getenv("JWT_SECRET")))
	mac.Write([]byte(data))
	return b64url(mac.Sum(nil))
}

type claims struct {
	UserID int   `json:"sub"`
	Exp    int64 `json:"exp"`
}

// CreateToken returns a JWT (HS256) for the user.
func CreateToken(userID int) (string, error) {
	header := b64url([]byte(`{"alg":"HS256","typ":"JWT"}`))

	payloadJSON, err := json.Marshal(claims{
		UserID: userID,
		Exp:    time.Now().Add(tokenTTL).Unix(),
	})
	if err != nil {
		return "", err
	}
	payload := b64url(payloadJSON)

	unsigned := header + "." + payload
	return unsigned + "." + sign(unsigned), nil
}

// VerifyToken checks the signature and expiry, and returns the user ID.
func VerifyToken(token string) (int, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return 0, ErrInvalidToken
	}

	expected := sign(parts[0] + "." + parts[1])
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return 0, ErrInvalidToken
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return 0, ErrInvalidToken
	}
	var c claims
	if err := json.Unmarshal(payloadJSON, &c); err != nil {
		return 0, ErrInvalidToken
	}
	if time.Now().Unix() > c.Exp {
		return 0, ErrInvalidToken
	}
	return c.UserID, nil
}
