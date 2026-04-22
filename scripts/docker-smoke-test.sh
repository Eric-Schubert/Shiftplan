#!/bin/sh
set -eu

IMAGE_NAME="${IMAGE_NAME:-schichtplaner:smoke}"
CONTAINER_NAME="${CONTAINER_NAME:-schichtplaner-smoke}"
HOST_PORT="${HOST_PORT:-3000}"
BASE_URL="http://127.0.0.1:${HOST_PORT}"
ADMIN_PASSWORD="${SHIFTPLAN_ADMIN_PASSWORD:-SmokeAdminPass1}"

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "[smoke] Container logs:"
    docker logs "$CONTAINER_NAME" 2>/dev/null || true
  fi
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[smoke] Building Docker image ${IMAGE_NAME}"
docker build --build-arg APP_VERSION=smoke -t "$IMAGE_NAME" .

echo "[smoke] Starting container ${CONTAINER_NAME}"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER_NAME" \
  -e "SHIFTPLAN_ADMIN_PASSWORD=${ADMIN_PASSWORD}" \
  -p "127.0.0.1:${HOST_PORT}:3000" \
  "$IMAGE_NAME" >/dev/null

echo "[smoke] Waiting for ${BASE_URL}"
for attempt in $(seq 1 60); do
  status_code="$(curl -fsS -o /dev/null -w "%{http_code}" "$BASE_URL/" || true)"
  if [ "$status_code" = "200" ]; then
    break
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "[smoke] Container exited before becoming healthy"
    exit 1
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "[smoke] App did not become reachable in time"
    exit 1
  fi

  sleep 2
done

echo "[smoke] Checking public shiftplan read"
curl -fsS "${BASE_URL}/api/shiftplan?year=2026&week=1" >/dev/null

echo "[smoke] Checking default admin login"
login_response="$(
  curl -fsS \
    -H "Content-Type: application/json" \
    -X POST \
    --data "{\"username\":\"admin\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${BASE_URL}/api/auth/login"
)"
compact_login_response="$(printf '%s' "$login_response" | tr -d '\n\r\t ')"

case "$compact_login_response" in
  *'"success":true'*'"username":"admin"'*) ;;
  *)
    echo "[smoke] Login response did not contain the expected admin user"
    echo "$login_response"
    exit 1
    ;;
esac

case "$compact_login_response" in
  *'"token"'*)
    echo "[smoke] Login response leaked a token field"
    echo "$login_response"
    exit 1
    ;;
esac

echo "[smoke] Checking unauthenticated mutation is rejected"
mutation_status="$(
  curl -sS -o /tmp/schichtplaner-smoke-mutation.txt -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -X POST \
    --data '{"year":2026,"week":1,"staff_id":1,"shift_id":1}' \
    "${BASE_URL}/api/shiftplan/assign" || true
)"

if [ "$mutation_status" != "401" ] && [ "$mutation_status" != "403" ]; then
  echo "[smoke] Expected protected mutation to return 401 or 403, got ${mutation_status}"
  cat /tmp/schichtplaner-smoke-mutation.txt
  exit 1
fi

echo "[smoke] Docker smoke test passed"
