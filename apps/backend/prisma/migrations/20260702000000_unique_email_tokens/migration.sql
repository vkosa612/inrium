-- Токени підтвердження пошти / скидання пароля зберігаються як sha256 і мають бути унікальними.
-- Безпечна міграція: NULL-значення не конфліктують; дублікати sha256 випадкових токенів неможливі.
-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");
