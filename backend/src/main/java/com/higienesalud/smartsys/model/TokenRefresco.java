package com.higienesalud.smartsys.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.higienesalud.smartsys.model.EntidadBase;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "refresh_token",
        uniqueConstraints = @UniqueConstraint(name = "uk_refresh_token_hash", columnNames = "token_hash"))
public class TokenRefresco extends EntidadBase {

    @JsonIgnore
    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @JsonIgnore
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Builder.Default
    @Column(nullable = false)
    private boolean revocado = false;

    @Column(name = "reemplazado_por", length = 64)
    private String reemplazadoPor;
}
