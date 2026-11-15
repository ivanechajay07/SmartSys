package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface TokenRefrescoDao extends JpaRepository<TokenRefresco, Long> {
    Optional<TokenRefresco> findByTokenHash(String tokenHash);
    void deleteByExpiraEnBefore(LocalDateTime date);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update TokenRefresco r set r.revocado = true where r.usuario.id = :usuarioId and r.revocado = false")
    int revokeAllByUsuarioId(@Param("usuarioId") Long usuarioId);
}
