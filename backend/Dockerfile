# Stage 1: Build the application using Maven
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw .
COPY src ./src
# Run Maven package command to build the application JAR
# Skip tests to speed up build - adjust if tests are needed for deployment build
RUN ./mvnw package -DskipTests

# Stage 2: Create the final runtime image using a JRE base image
# Use eclipse-temurin which supports ARM64
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Copy the built JAR file from the build stage
# Ensure the target directory and JAR name match your build output
# Typically target/*.jar is correct for Spring Boot Maven Plugin
COPY --from=build /app/target/*.jar app.jar
# Expose the port the application runs on (defined in application.properties or default 8080/8443)
# We map port 8443 in docker-compose, so let's assume the app runs on 8443 internally too.
EXPOSE 8443
# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"] 