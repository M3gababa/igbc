# AWS Deployment Tasks — `api/` + `webapp/`

Ordered checklist for the initial AWS deployment, mirroring `api/DEPLOYMENT.md` +
`webapp/DEPLOYMENT.md`. `api/` first — `webapp/` depends on its URL and reuses its ALB.

**⚠️ MANUAL steps are called out explicitly** (console clicks, Atlas dashboard, Auth0 dashboard) —
everything else is a CLI command you can run as-is.

Known values, already confirmed:

| Value | |
|---|---|
| AWS Account | `541467119525` |
| Region | `us-east-1` |
| Route 53 zone (`sheev.fr`) | `Z04910682OQP8GLAP6TV2` |

**Secrets:** the `secretsmanager create-secret` commands below `source` `api/.env` /
`webapp/bff/.env` at run time and pass the value via shell variable — the real values are never
written into this file, only read from the `.env` files that already hold them.

---

## Phase 0 — MongoDB Atlas

- [ ] **⚠️ MANUAL (Atlas dashboard, not AWS):** Network Access → add `0.0.0.0/0` to the allowlist.

---

## Phase 1 — `api/`

- [ ] Create the ECR repository
  ```bash
  aws ecr create-repository --repository-name igbc-api --region us-east-1
  ```

- [ ] Create the 13 secrets (sources `api/.env`)
  ```bash
  set -a; source api/.env; set +a
  aws secretsmanager create-secret --name igbc/api/auth0-domain --secret-string "$AUTH0_DOMAIN" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/auth0-audience --secret-string "$AUTH0_AUDIENCE" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/auth0-m2m-domain --secret-string "$AUTH0_M2M_DOMAIN" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/auth0-m2m-client-id --secret-string "$AUTH0_M2M_CLIENT_ID" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/auth0-m2m-client-secret --secret-string "$AUTH0_M2M_CLIENT_SECRET" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/mongodb-username --secret-string "$MONGODB_USERNAME" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/mongodb-password --secret-string "$MONGODB_PASSWORD" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/mongodb-domain --secret-string "$MONGODB_DOMAIN" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/mongodb-database --secret-string "$MONGODB_DATABASE" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/fga-api-url --secret-string "$FGA_API_URL" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/fga-store-id --secret-string "$FGA_STORE_ID" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/fga-client-id --secret-string "$FGA_CLIENT_ID" --region us-east-1
  aws secretsmanager create-secret --name igbc/api/fga-client-secret --secret-string "$FGA_CLIENT_SECRET" --region us-east-1
  ```

- [ ] Build, tag, push the image
  ```bash
  cd api
  aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin 541467119525.dkr.ecr.us-east-1.amazonaws.com
  docker build -t igbc-api .
  docker tag igbc-api:latest 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-api:latest
  docker push 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-api:latest
  cd ..
  ```

- [ ] **⚠️ MANUAL (ECS console → "Express mode"):** create service `igbc-api` —
  image URI from the push above, new task execution role, new infrastructure role,
  container port `4000`, health check path `/health`, env var `PORT=4000`, the 13
  secret-backed env vars from the step above (each pointed at its Secrets Manager ARN),
  default VPC. Not a documented plain `aws ecs create-service` call.

- [ ] Confirm health on the auto-generated URL before touching DNS
  ```bash
  curl https://<generated-id>.ecs.us-east-1.on.aws/health
  ```

- [ ] Request the ACM certificate
  ```bash
  aws acm request-certificate --domain-name api.igbc.sheev.fr --validation-method DNS --region us-east-1
  ```

- [ ] Create the DNS validation record (use the `ResourceRecord` from `describe-certificate`)
  ```bash
  aws route53 change-resource-record-sets --hosted-zone-id Z04910682OQP8GLAP6TV2 --change-batch '{
    "Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
      "Name": "<validation-cname-name>", "Type": "CNAME", "TTL": 300,
      "ResourceRecords": [{"Value": "<validation-cname-value>"}]
    }}]
  }'
  ```

- [ ] Poll until issued
  ```bash
  aws acm describe-certificate --certificate-arn <ACM_CERT_ARN> --region us-east-1
  ```

- [ ] Get the shared ALB's listener + rule ARNs
  ```bash
  aws elbv2 describe-listeners --load-balancer-arn <ALB_ARN> --region us-east-1
  aws elbv2 describe-rules --listener-arn <HTTPS_LISTENER_ARN> --region us-east-1
  ```

- [ ] Add the custom hostname as an OR condition on `igbc-api`'s rule
  ```bash
  aws elbv2 modify-rule --rule-arn <IGBC_API_RULE_ARN> --conditions \
    '[{"Field":"host-header","HostHeaderConfig":{"Values":["<on.aws-hostname>","api.igbc.sheev.fr"]}}]' \
    --region us-east-1
  ```

- [ ] Attach the cert to the shared listener (SNI)
  ```bash
  aws elbv2 add-listener-certificates --listener-arn <HTTPS_LISTENER_ARN> \
    --certificates CertificateArn=<ACM_CERT_ARN> --region us-east-1
  ```

- [ ] Route 53 alias record
  ```bash
  aws route53 change-resource-record-sets --hosted-zone-id Z04910682OQP8GLAP6TV2 --change-batch '{
    "Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
      "Name": "api.igbc.sheev.fr", "Type": "A",
      "AliasTarget": {"HostedZoneId": "<ALB_HOSTED_ZONE_ID>", "DNSName": "<ALB_DNS_NAME>", "EvaluateTargetHealth": true}
    }}]
  }'
  ```

- [ ] Verify
  ```bash
  curl https://api.igbc.sheev.fr/health
  ```

---

## Phase 2 — `webapp/`

- [ ] Create the ECR repository
  ```bash
  aws ecr create-repository --repository-name igbc-webapp --region us-east-1
  ```

- [ ] Create the 7 secrets (sources `webapp/bff/.env`; `api-base-url` is the Phase 1 domain, not `.env`)
  ```bash
  set -a; source webapp/bff/.env; set +a
  aws secretsmanager create-secret --name igbc/webapp/auth0-domain --secret-string "$AUTH0_DOMAIN" --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/auth0-client-id --secret-string "$AUTH0_CLIENT_ID" --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/auth0-client-secret --secret-string "$AUTH0_CLIENT_SECRET" --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/auth0-session-secret --secret-string "$AUTH0_SESSION_SECRET" --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/auth0-audience --secret-string "$AUTH0_AUDIENCE" --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/app-base-url --secret-string 'https://igbc.sheev.fr' --region us-east-1
  aws secretsmanager create-secret --name igbc/webapp/api-base-url --secret-string 'https://api.igbc.sheev.fr' --region us-east-1
  ```

- [ ] Build, tag, push the image
  ```bash
  cd webapp
  aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin 541467119525.dkr.ecr.us-east-1.amazonaws.com
  docker build -t igbc-webapp .
  docker tag igbc-webapp:latest 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-webapp:latest
  docker push 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-webapp:latest
  cd ..
  ```

- [ ] **⚠️ MANUAL (ECS console → "Express mode"):** create service `igbc-webapp` —
  image URI from the push above, reuse (or create) the task execution/infrastructure roles,
  container port `3000`, health check path `/`, env var `PORT=3000`, the 7 secret-backed env
  vars from the step above, default VPC. Reuses the same shared ALB from Phase 1 (second
  Express Mode service in this account/region).

- [ ] Confirm health on the auto-generated URL before touching DNS
  ```bash
  curl https://<generated-id>.ecs.us-east-1.on.aws/
  ```

- [ ] Request the ACM certificate
  ```bash
  aws acm request-certificate --domain-name igbc.sheev.fr --validation-method DNS --region us-east-1
  ```

- [ ] Create the DNS validation record, poll until issued (same pattern as Phase 1)
  ```bash
  aws route53 change-resource-record-sets --hosted-zone-id Z04910682OQP8GLAP6TV2 --change-batch '{...}'
  aws acm describe-certificate --certificate-arn <ACM_CERT_ARN> --region us-east-1
  ```

- [ ] Add the custom hostname as an OR condition on `igbc-webapp`'s rule (same listener as `api/`)
  ```bash
  aws elbv2 describe-rules --listener-arn <HTTPS_LISTENER_ARN> --region us-east-1
  aws elbv2 modify-rule --rule-arn <IGBC_WEBAPP_RULE_ARN> --conditions \
    '[{"Field":"host-header","HostHeaderConfig":{"Values":["<on.aws-hostname>","igbc.sheev.fr"]}}]' \
    --region us-east-1
  ```

- [ ] Attach the cert to the shared listener
  ```bash
  aws elbv2 add-listener-certificates --listener-arn <HTTPS_LISTENER_ARN> \
    --certificates CertificateArn=<ACM_CERT_ARN> --region us-east-1
  ```

- [ ] Route 53 alias record
  ```bash
  aws route53 change-resource-record-sets --hosted-zone-id Z04910682OQP8GLAP6TV2 --change-batch '{
    "Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
      "Name": "igbc.sheev.fr", "Type": "A",
      "AliasTarget": {"HostedZoneId": "<ALB_HOSTED_ZONE_ID>", "DNSName": "<ALB_DNS_NAME>", "EvaluateTargetHealth": true}
    }}]
  }'
  ```

- [ ] **⚠️ MANUAL (Auth0 dashboard, not AWS):** on the webapp's Regular Web Application, add:
  - Allowed Callback URL: `https://igbc.sheev.fr/auth/callback`
  - Allowed Logout URL: `https://igbc.sheev.fr`
  - Allowed Web Origin: `https://igbc.sheev.fr`

- [ ] **⚠️ MANUAL:** open `https://igbc.sheev.fr` in a browser and log in end-to-end — verify.

---

## Ongoing (not part of initial deploy)

`scripts/aws-redeploy.sh` wraps the redeploy loop below — build, tag, push, force a new
ECS deployment, wait for it to stabilize. Requires the initial deploy (Phases 0–2) to have already
happened at least once; it only updates existing ECS services, it doesn't create them. Run it from
the `scripts/` folder.

```bash
cd scripts
./aws-redeploy.sh api      # rebuild + redeploy just api/
./aws-redeploy.sh webapp   # rebuild + redeploy just webapp/
./aws-redeploy.sh          # or: ./aws-redeploy.sh all — both
```

What it runs per service, for reference:
```bash
docker build -t igbc-<service> .
docker tag igbc-<service>:latest 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-<service>:latest
docker push 541467119525.dkr.ecr.us-east-1.amazonaws.com/igbc-<service>:latest
aws ecs update-service --cluster default --service igbc-<service> --force-new-deployment --region us-east-1
aws ecs wait services-stable --cluster default --services igbc-<service> --region us-east-1
```
