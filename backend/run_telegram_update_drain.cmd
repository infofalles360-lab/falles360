@echo off
setlocal

set "PHP_BIN=C:\xampp\php\php.exe"
if exist "%PHP_BIN%" (
  "%PHP_BIN%" "%~dp0drain_telegram_updates.php" %*
) else (
  php "%~dp0drain_telegram_updates.php" %*
)
