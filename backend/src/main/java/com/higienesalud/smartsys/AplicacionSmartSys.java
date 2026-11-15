package com.higienesalud.smartsys;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AplicacionSmartSys {
    public static void main(String[] args) {
        SpringApplication.run(AplicacionSmartSys.class, args);
    }
}
