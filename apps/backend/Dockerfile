FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jdk
WORKDIR /app
ENV JAVA_OPTS=""
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8000
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
