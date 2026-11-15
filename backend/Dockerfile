# ---------- Build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache de dependencias
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B -DskipTests package

# ---------- Runtime ----------
FROM eclipse-temurin:21-jre

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 --create-home smartsys

WORKDIR /app
COPY --from=build /build/target/smartsys-1.0.0.jar app.jar
RUN chown -R smartsys:smartsys /app

USER smartsys
EXPOSE 8080

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
