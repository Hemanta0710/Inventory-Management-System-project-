# Database Connection Guide (Spring Boot + PostgreSQL)

Use this checklist whenever database connection fails.

## A. Known-good baseline
1. Start database:
   - `docker compose up -d`
2. Confirm container is healthy:
   - `docker ps`
3. Verify backend env values match:
   - `DB_HOST=localhost`
   - `DB_PORT=5432`
   - `DB_NAME=inventory_db`
   - `DB_USER=inventory_user`
   - `DB_PASSWORD=inventory_pass`
4. Run backend:
   - `cd backend`
   - `mvn spring-boot:run`
5. Check:
   - `http://localhost:8080/actuator/health/db`

If status is UP, DB connection is successful.

## B. Fast diagnosis flow
1. Is PostgreSQL process running?
- If not, start with Docker Compose.

2. Is port 5432 already occupied by another local postgres?
- Windows check:
  - `netstat -ano | findstr :5432`
- If conflict exists, change mapped port in docker-compose and update DB_PORT.

3. Are credentials wrong?
- If username or password changed, recreate container with clean volume:
  - `docker compose down -v`
  - `docker compose up -d`

4. Is JDBC URL wrong?
- Format must be:
  - `jdbc:postgresql://HOST:PORT/DB_NAME`

5. Is migration failing before app starts?
- Inspect startup logs for Flyway SQL errors.
- Fix SQL in migration file.

6. Is backend using old environment values?
- Restart terminal and backend process.
- Confirm active profile and env variables.

## C. Typical errors and fixes
1. Error: Connection refused
- Cause: database not running or wrong host/port.
- Fix: start container, verify port mapping.

2. Error: FATAL password authentication failed
- Cause: credential mismatch.
- Fix: align env vars with container credentials.

3. Error: relation does not exist
- Cause: migration did not run or wrong schema.
- Fix: check Flyway logs and migration naming.

4. Error: cannot load driver class org.postgresql.Driver
- Cause: missing postgres dependency.
- Fix: ensure postgres dependency exists in pom.

## D. Debug commands you should remember
1. View container logs:
- `docker logs ims_postgres`

2. Open PostgreSQL shell:
- `docker exec -it ims_postgres psql -U inventory_user -d inventory_db`

3. Check tables:
- `\dt`

4. Check records:
- `SELECT * FROM products;`

## E. Working request examples
Create product:
```bash
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d "{\"sku\":\"SKU-1001\",\"name\":\"Rice Bag\",\"quantity\":40,\"reorderLevel\":10,\"unitPrice\":350.00}"
```

Get products:
```bash
curl http://localhost:8080/api/products
```

## F. Rule to avoid future pain
Never change DB credentials in one place only. Keep the same values in:
- docker-compose
- backend environment variables
- CI deployment secrets
