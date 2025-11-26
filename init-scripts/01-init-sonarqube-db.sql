-- Create SonarQube database if it doesn't exist
SELECT 'CREATE DATABASE sonarqube'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sonarqube')\gexec
