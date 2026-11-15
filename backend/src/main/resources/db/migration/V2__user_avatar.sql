-- Avatar del usuario almacenado como data URL (imagen ya redimensionada por el cliente).
ALTER TABLE usuario ADD COLUMN avatar_url LONGTEXT NULL;
